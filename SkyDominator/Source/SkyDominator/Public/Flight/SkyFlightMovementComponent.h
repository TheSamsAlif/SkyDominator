#pragma once

#include "CoreMinimal.h"
#include "GameFramework/PawnMovementComponent.h"
#include "SkyDominatorTypes.h"
#include "SkyFlightMovementComponent.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnStallWarningSignature, bool, bIsStalling);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnGForceExceededSignature, float, CurrentGForce, float, MaxTolerance);

/**
 * Advanced Aerodynamic Flight Simulation Movement Component
 */
UCLASS(ClassGroup=(Custom), meta=(BlueprintSpawnableComponent))
class SKYDOMINATOR_API USkyFlightMovementComponent : public UPawnMovementComponent
{
	GENERATED_BODY()

public:
	USkyFlightMovementComponent();

	virtual void TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction) override;

	// Flight Inputs
	UFUNCTION(BlueprintCallable, Category = "Flight Input")
	void SetPitchInput(float Value);

	UFUNCTION(BlueprintCallable, Category = "Flight Input")
	void SetRollInput(float Value);

	UFUNCTION(BlueprintCallable, Category = "Flight Input")
	void SetYawInput(float Value);

	UFUNCTION(BlueprintCallable, Category = "Flight Input")
	void SetThrottleInput(float Value);

	UFUNCTION(BlueprintCallable, Category = "Flight Input")
	void SetAfterburnerActive(bool bActive);

	UFUNCTION(BlueprintCallable, Category = "Flight Input")
	void SetAirbrakeActive(bool bActive);

	// Stats Configuration
	UFUNCTION(BlueprintCallable, Category = "Flight Config")
	void InitializeFlightStats(const FAircraftFlightStats& InStats, const FAircraftDurabilityStats& InDurability);

	// Getters for Telemetry / HUD
	UFUNCTION(BlueprintPure, Category = "Flight Telemetry")
	float GetAirspeedKnots() const;

	UFUNCTION(BlueprintPure, Category = "Flight Telemetry")
	float GetMachNumber() const;

	UFUNCTION(BlueprintPure, Category = "Flight Telemetry")
	float GetAltitudeMeters() const;

	UFUNCTION(BlueprintPure, Category = "Flight Telemetry")
	float GetThrottlePercent() const;

	UFUNCTION(BlueprintPure, Category = "Flight Telemetry")
	float GetBoostEnergyPercent() const;

	UFUNCTION(BlueprintPure, Category = "Flight Telemetry")
	float GetCurrentGForce() const;

	UFUNCTION(BlueprintPure, Category = "Flight Telemetry")
	float GetAngleOfAttackDegrees() const;

	UFUNCTION(BlueprintPure, Category = "Flight Telemetry")
	bool IsStalling() const { return bStallActive; }

	UFUNCTION(BlueprintPure, Category = "Flight Telemetry")
	bool IsAfterburnerActive() const { return bAfterburnerActive && CurrentBoostEnergy > 0.0f; }

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Flight Profile")
	EFlightHandlingProfile HandlingProfile;

	UPROPERTY(BlueprintAssignable, Category = "Flight|Events")
	FOnStallWarningSignature OnStallWarning;

	UPROPERTY(BlueprintAssignable, Category = "Flight|Events")
	FOnGForceExceededSignature OnGForceExceeded;

protected:
	virtual void BeginPlay() override;

	// Internal aerodynamic calculations
	void CalculateAerodynamics(float DeltaTime);
	void UpdateRotationalDynamics(float DeltaTime);
	float GetAirDensityAtAltitude(float AltitudeMeters) const;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Aerodynamic Tuning")
	FAircraftFlightStats FlightStats;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Aerodynamic Tuning")
	FAircraftDurabilityStats DurabilityStats;

	// Runtime States
	float RawPitchInput = 0.0f;
	float RawRollInput = 0.0f;
	float RawYawInput = 0.0f;
	float TargetThrottle = 0.6f;
	float CurrentThrottle = 0.6f;
	bool bAfterburnerActive = false;
	bool bAirbrakeActive = false;
	bool bStallActive = false;

	float CurrentBoostEnergy = 100.0f;
	float CurrentGForce = 1.0f;
	float CurrentAngleOfAttack = 0.0f;
	FVector CurrentLinearVelocity = FVector::ZeroVector;
	FRotator CurrentAngularVelocity = FRotator::ZeroRotator;
	FVector PreviousLinearVelocity = FVector::ZeroVector;
};

