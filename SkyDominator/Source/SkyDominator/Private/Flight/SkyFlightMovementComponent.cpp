#include "Flight/SkyFlightMovementComponent.h"
#include "GameFramework/Pawn.h"

USkyFlightMovementComponent::USkyFlightMovementComponent()
{
	PrimaryComponentTick.bCanEverTick = true;
	PrimaryComponentTick.TickGroup = TG_PrePhysics;
	HandlingProfile = EFlightHandlingProfile::Advanced;
}

void USkyFlightMovementComponent::BeginPlay()
{
	Super::BeginPlay();

	CurrentBoostEnergy = DurabilityStats.BoostEnergyMax;
	if (UpdatedComponent)
	{
		CurrentLinearVelocity = UpdatedComponent->GetForwardVector() * (FlightStats.CruiseSpeedKts * 51.4444f); // Convert knots to cm/s
	}
}

void USkyFlightMovementComponent::InitializeFlightStats(const FAircraftFlightStats& InStats, const FAircraftDurabilityStats& InDurability)
{
	FlightStats = InStats;
	DurabilityStats = InDurability;
	CurrentBoostEnergy = DurabilityStats.BoostEnergyMax;
}

void USkyFlightMovementComponent::SetPitchInput(float Value)
{
	RawPitchInput = FMath::Clamp(Value, -1.0f, 1.0f);
}

void USkyFlightMovementComponent::SetRollInput(float Value)
{
	RawRollInput = FMath::Clamp(Value, -1.0f, 1.0f);
}

void USkyFlightMovementComponent::SetYawInput(float Value)
{
	RawYawInput = FMath::Clamp(Value, -1.0f, 1.0f);
}

void USkyFlightMovementComponent::SetThrottleInput(float Value)
{
	TargetThrottle = FMath::Clamp(Value, 0.0f, 1.0f);
}

void USkyFlightMovementComponent::SetAfterburnerActive(bool bActive)
{
	bAfterburnerActive = bActive;
}

void USkyFlightMovementComponent::SetAirbrakeActive(bool bActive)
{
	bAirbrakeActive = bActive;
}

void USkyFlightMovementComponent::TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction)
{
	Super::TickComponent(DeltaTime, TickType, ThisTickFunction);

	if (!ShouldSkipUpdate(DeltaTime) && UpdatedComponent)
	{
		CalculateAerodynamics(DeltaTime);
		UpdateRotationalDynamics(DeltaTime);
	}
}

float USkyFlightMovementComponent::GetAirDensityAtAltitude(float AltitudeMeters) const
{
	// Barometric formula approximation: rho = rho0 * exp(-h / 8500)
	const float SeaLevelDensity = 1.225f; // kg/m^3
	const float ScaleHeight = 8500.0f;
	return SeaLevelDensity * FMath::Exp(-FMath::Max(0.0f, AltitudeMeters) / ScaleHeight);
}

void USkyFlightMovementComponent::CalculateAerodynamics(float DeltaTime)
{
	const AActor* OwnerActor = UpdatedComponent->GetOwner();
	if (!OwnerActor) return;

	const FVector ForwardVector = UpdatedComponent->GetForwardVector();
	const FVector UpVector = UpdatedComponent->GetUpVector();
	const FVector RightVector = UpdatedComponent->GetRightVector();

	const float AltitudeMeters = UpdatedComponent->GetComponentLocation().Z / 100.0f;
	const float AirDensity = GetAirDensityAtAltitude(AltitudeMeters);

	// Throttle Response
	CurrentThrottle = FMath::FInterpTo(CurrentThrottle, TargetThrottle, DeltaTime, 2.5f);

	// Afterburner & Boost Energy Management
	float ThrustMultiplier = 1.0f;
	if (bAfterburnerActive && CurrentBoostEnergy > 0.0f)
	{
		ThrustMultiplier = FlightStats.AfterburnerMultiplier;
		CurrentBoostEnergy = FMath::Max(0.0f, CurrentBoostEnergy - (25.0f * DeltaTime));
	}
	else
	{
		CurrentBoostEnergy = FMath::Min(DurabilityStats.BoostEnergyMax, CurrentBoostEnergy + (DurabilityStats.BoostRechargeRatePerSec * DeltaTime));
	}

	// Calculate Speed (cm/s to m/s)
	const float AirspeedCmPerSec = CurrentLinearVelocity.Size();
	const float AirspeedMetersPerSec = AirspeedCmPerSec / 100.0f;
	const float AirspeedKnots = AirspeedMetersPerSec * 1.94384f;

	// Dynamic Pressure: q = 0.5 * rho * v^2
	const float DynamicPressure = 0.5f * AirDensity * FMath::Square(AirspeedMetersPerSec);

	// Angle of Attack (AoA)
	if (AirspeedCmPerSec > 10.0f)
	{
		const FVector NormalizedVelocity = CurrentLinearVelocity.GetSafeNormal();
		const float ForwardDot = FMath::Clamp(FVector::DotProduct(ForwardVector, NormalizedVelocity), -1.0f, 1.0f);
		CurrentAngleOfAttack = FMath::RadiansToDegrees(FMath::Acos(ForwardDot));
		if (FVector::DotProduct(UpVector, NormalizedVelocity) > 0.0f)
		{
			CurrentAngleOfAttack = -CurrentAngleOfAttack;
		}
	}
	else
	{
		CurrentAngleOfAttack = 0.0f;
	}

	// Stall Logic
	const float CriticalStallAngle = 22.0f;
	const bool bWasStalling = bStallActive;
	bStallActive = (FMath::Abs(CurrentAngleOfAttack) > CriticalStallAngle) || (AirspeedKnots < FlightStats.StallSpeedKts && AltitudeMeters > 50.0f);

	if (bStallActive != bWasStalling)
	{
		OnStallWarning.Broadcast(bStallActive);
	}

	// Thrust Force (Newtons -> cm/s^2)
	const float ForwardThrustNewtons = FlightStats.ThrustPowerNewtons * CurrentThrottle * ThrustMultiplier;
	const FVector ThrustForce = ForwardVector * (ForwardThrustNewtons * 0.1f); // Scaled for Unreal unit mass

	// Lift Calculation
	float LiftCoefficient = FMath::Clamp(FMath::Sin(FMath::DegreesToRadians(CurrentAngleOfAttack * 2.0f)) * 1.5f, -1.8f, 1.8f);
	if (bStallActive)
	{
		LiftCoefficient *= 0.25f; // Severe lift drop in stall
	}
	const float LiftForceMag = DynamicPressure * 25.0f * LiftCoefficient * 100.0f; // Scale to cm/s^2
	const FVector LiftForce = UpVector * LiftForceMag;

	// Drag Calculation (Parasitic + Induced + Transonic + Airbrake)
	float DragCoefficient = 0.025f + (FMath::Square(LiftCoefficient) / (3.14159f * 0.85f * 3.5f));
	if (GetMachNumber() > 0.9f && GetMachNumber() < 1.2f)
	{
		DragCoefficient += 0.04f; // Transonic wave drag spike
	}
	if (bAirbrakeActive)
	{
		DragCoefficient += 0.08f;
	}
	const float DragForceMag = DynamicPressure * 25.0f * DragCoefficient * 100.0f;
	const FVector DragForce = (AirspeedCmPerSec > 1.0f) ? (-CurrentLinearVelocity.GetSafeNormal() * DragForceMag) : FVector::ZeroVector;

	// Gravity Force (980 cm/s^2)
	const FVector GravityForce = FVector(0.0f, 0.0f, -980.0f);

	// Total Linear Acceleration
	const FVector Acceleration = (ThrustForce + LiftForce + DragForce + GravityForce) * DeltaTime;
	CurrentLinearVelocity += Acceleration;

	// Compute G-Force
	if (DeltaTime > 0.0001f)
	{
		const FVector DeltaV = CurrentLinearVelocity - PreviousLinearVelocity;
		const float NormalAccCm = FVector::DotProduct(DeltaV / DeltaTime, UpVector);
		CurrentGForce = (NormalAccCm / 980.0f) + 1.0f;

		if (CurrentGForce > FlightStats.MaxGForceTolerance)
		{
			OnGForceExceeded.Broadcast(CurrentGForce, FlightStats.MaxGForceTolerance);
		}
	}
	PreviousLinearVelocity = CurrentLinearVelocity;

	// Move Actor
	FHitResult Hit(1.f);
	SafeMoveUpdatedComponent(CurrentLinearVelocity * DeltaTime, UpdatedComponent->GetComponentRotation(), true, Hit);

	if (Hit.IsValidBlockingHit())
	{
		SlideAlongSurface(CurrentLinearVelocity * DeltaTime, 1.f - Hit.Time, Hit.Normal, Hit, true);
	}
}

void USkyFlightMovementComponent::UpdateRotationalDynamics(float DeltaTime)
{
	const float AirspeedKnots = GetAirspeedKnots();
	// Control effectiveness scales with airspeed (so planes cannot turn rapidly at 0 knots)
	const float ControlAuthority = FMath::Clamp(AirspeedKnots / 250.0f, 0.15f, 1.0f);

	float PitchSpeed = FlightStats.PitchRateDegPerSec * ControlAuthority;
	float RollSpeed = FlightStats.RollRateDegPerSec * ControlAuthority;
	float YawSpeed = FlightStats.YawRateDegPerSec * ControlAuthority;

	if (HandlingProfile == EFlightHandlingProfile::Beginner)
	{
		// Auto-level roll when no roll input is given
		if (FMath::IsNearlyZero(RawRollInput, 0.05f))
		{
			const float CurrentRoll = UpdatedComponent->GetComponentRotation().Roll;
			RawRollInput = FMath::Clamp(-CurrentRoll / 45.0f, -0.6f, 0.6f);
		}
	}

	const FRotator DeltaRot(
		RawPitchInput * PitchSpeed * DeltaTime,
		RawYawInput * YawSpeed * DeltaTime,
		RawRollInput * RollSpeed * DeltaTime
	);

	UpdatedComponent->AddLocalRotation(DeltaRot);
}

float USkyFlightMovementComponent::GetAirspeedKnots() const
{
	return (CurrentLinearVelocity.Size() / 100.0f) * 1.94384f;
}

float USkyFlightMovementComponent::GetMachNumber() const
{
	// Speed of sound roughly 340 m/s (~661 kts) at standard sea level
	return GetAirspeedKnots() / 661.47f;
}

float USkyFlightMovementComponent::GetAltitudeMeters() const
{
	return UpdatedComponent ? (UpdatedComponent->GetComponentLocation().Z / 100.0f) : 0.0f;
}

float USkyFlightMovementComponent::GetThrottlePercent() const
{
	return CurrentThrottle;
}

float USkyFlightMovementComponent::GetBoostEnergyPercent() const
{
	return DurabilityStats.BoostEnergyMax > 0.0f ? (CurrentBoostEnergy / DurabilityStats.BoostEnergyMax) : 0.0f;
}

float USkyFlightMovementComponent::GetCurrentGForce() const
{
	return CurrentGForce;
}

float USkyFlightMovementComponent::GetAngleOfAttackDegrees() const
{
	return CurrentAngleOfAttack;
}

