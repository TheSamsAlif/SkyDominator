#include "Aircraft/SkyAircraftBase.h"
#include "Components/SkeletalMeshComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "Camera/CameraComponent.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "Flight/SkyFlightMovementComponent.h"
#include "Damage/SkyDamageComponent.h"
#include "Data/SkyAircraftDataAsset.h"
#include "SkyDominator.h"

ASkyAircraftBase::ASkyAircraftBase()
{
	PrimaryActorTick.bCanEverTick = true;

	// Mesh Root
	AircraftMesh = CreateDefaultSubobject<USkeletalMeshComponent>(TEXT("AircraftMesh"));
	RootComponent = AircraftMesh;
	AircraftMesh->SetCollisionProfileName(TEXT("Vehicle"));

	// Flight Movement Component
	FlightMovementComponent = CreateDefaultSubobject<USkyFlightMovementComponent>(TEXT("FlightMovementComponent"));
	FlightMovementComponent->SetUpdatedComponent(RootComponent);

	// Damage Component
	DamageComponent = CreateDefaultSubobject<USkyDamageComponent>(TEXT("DamageComponent"));

	// Camera Boom (Chase View)
	SpringArm = CreateDefaultSubobject<USpringArmComponent>(TEXT("SpringArm"));
	SpringArm->SetupAttachment(RootComponent);
	SpringArm->TargetArmLength = 1200.0f;
	SpringArm->SocketOffset = FVector(0.0f, 0.0f, 180.0f);
	SpringArm->bEnableCameraLag = true;
	SpringArm->bEnableCameraRotationLag = true;
	SpringArm->CameraLagSpeed = 12.0f;
	SpringArm->CameraRotationLagSpeed = 16.0f;
	SpringArm->bInheritPitch = true;
	SpringArm->bInheritRoll = true;
	SpringArm->bInheritYaw = true;

	ChaseCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("ChaseCamera"));
	ChaseCamera->SetupAttachment(SpringArm, USpringArmComponent::SocketName);
	ChaseCamera->SetFieldOfView(DefaultCameraFOV);

	// Cockpit Interior Camera
	CockpitCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("CockpitCamera"));
	CockpitCamera->SetupAttachment(RootComponent);
	CockpitCamera->SetRelativeLocation(FVector(150.0f, 0.0f, 60.0f));
	CockpitCamera->bAutoActivate = false;
}

void ASkyAircraftBase::BeginPlay()
{
	Super::BeginPlay();

	// Bind Enhanced Input Mapping Context
	if (const APlayerController* PC = Cast<APlayerController>(GetController()))
	{
		if (UEnhancedInputLocalPlayerSubsystem* Subsystem = ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(PC->GetLocalPlayer()))
		{
			if (DefaultMappingContext)
			{
				Subsystem->AddMappingContext(DefaultMappingContext, 0);
			}
		}
	}

	if (DamageComponent)
	{
		DamageComponent->OnAircraftDestroyed.AddDynamic(this, &ASkyAircraftBase::HandleAircraftDestroyed);
	}
}

void ASkyAircraftBase::Tick(float DeltaTime)
{
	Super::Tick(DeltaTime);

	// Dynamic Camera FOV based on Mach speed for cinematic sensation
	if (FlightMovementComponent && ChaseCamera && ActiveCameraIndex == 0)
	{
		const float Mach = FlightMovementComponent->GetMachNumber();
		const float TargetFOV = FMath::Clamp(DefaultCameraFOV + (Mach * 15.0f), DefaultCameraFOV, 115.0f);
		ChaseCamera->FieldOfView = FMath::FInterpTo(ChaseCamera->FieldOfView, TargetFOV, DeltaTime, 4.0f);
	}
}

void ASkyAircraftBase::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
	Super::SetupPlayerInputComponent(PlayerInputComponent);

	if (UEnhancedInputComponent* EnhancedInputComponent = Cast<UEnhancedInputComponent>(PlayerInputComponent))
	{
		if (ActionPitch)
		{
			EnhancedInputComponent->BindAction(ActionPitch, ETriggerEvent::Triggered, this, &ASkyAircraftBase::HandlePitchInput);
			EnhancedInputComponent->BindAction(ActionPitch, ETriggerEvent::Completed, this, &ASkyAircraftBase::HandlePitchInput);
		}
		if (ActionRoll)
		{
			EnhancedInputComponent->BindAction(ActionRoll, ETriggerEvent::Triggered, this, &ASkyAircraftBase::HandleRollInput);
			EnhancedInputComponent->BindAction(ActionRoll, ETriggerEvent::Completed, this, &ASkyAircraftBase::HandleRollInput);
		}
		if (ActionYaw)
		{
			EnhancedInputComponent->BindAction(ActionYaw, ETriggerEvent::Triggered, this, &ASkyAircraftBase::HandleYawInput);
			EnhancedInputComponent->BindAction(ActionYaw, ETriggerEvent::Completed, this, &ASkyAircraftBase::HandleYawInput);
		}
		if (ActionThrottle)
		{
			EnhancedInputComponent->BindAction(ActionThrottle, ETriggerEvent::Triggered, this, &ASkyAircraftBase::HandleThrottleInput);
		}
		if (ActionBoost)
		{
			EnhancedInputComponent->BindAction(ActionBoost, ETriggerEvent::Triggered, this, &ASkyAircraftBase::HandleBoostInput);
			EnhancedInputComponent->BindAction(ActionBoost, ETriggerEvent::Completed, this, &ASkyAircraftBase::HandleBoostInput);
		}
		if (ActionAirbrake)
		{
			EnhancedInputComponent->BindAction(ActionAirbrake, ETriggerEvent::Triggered, this, &ASkyAircraftBase::HandleAirbrakeInput);
			EnhancedInputComponent->BindAction(ActionAirbrake, ETriggerEvent::Completed, this, &ASkyAircraftBase::HandleAirbrakeInput);
		}
		if (ActionCycleCamera)
		{
			EnhancedInputComponent->BindAction(ActionCycleCamera, ETriggerEvent::Started, this, &ASkyAircraftBase::CycleCameraView);
		}
		if (ActionFireCannon)
		{
			EnhancedInputComponent->BindAction(ActionFireCannon, ETriggerEvent::Triggered, this, &ASkyAircraftBase::HandleFireCannon);
		}
		if (ActionFireMissile)
		{
			EnhancedInputComponent->BindAction(ActionFireMissile, ETriggerEvent::Started, this, &ASkyAircraftBase::HandleFireMissile);
		}
		if (ActionSpecialAbility)
		{
			EnhancedInputComponent->BindAction(ActionSpecialAbility, ETriggerEvent::Started, this, &ASkyAircraftBase::HandleSpecialAbility);
		}
	}
}

void ASkyAircraftBase::ApplyAircraftData(USkyAircraftDataAsset* DataAsset)
{
	if (!DataAsset) return;

	if (FlightMovementComponent)
	{
		FlightMovementComponent->InitializeFlightStats(DataAsset->FlightStats, DataAsset->DurabilityStats);
	}

	if (DamageComponent)
	{
		DamageComponent->InitializeDamageStats(DataAsset->DurabilityStats);
	}
}

void ASkyAircraftBase::CycleCameraView()
{
	ActiveCameraIndex = (ActiveCameraIndex + 1) % 2;
	if (ActiveCameraIndex == 0)
	{
		ChaseCamera->SetActive(true);
		CockpitCamera->SetActive(false);
	}
	else
	{
		ChaseCamera->SetActive(false);
		CockpitCamera->SetActive(true);
	}
}

void ASkyAircraftBase::HandlePitchInput(const FInputActionValue& Value)
{
	if (FlightMovementComponent)
	{
		FlightMovementComponent->SetPitchInput(Value.Get<float>());
	}
}

void ASkyAircraftBase::HandleRollInput(const FInputActionValue& Value)
{
	if (FlightMovementComponent)
	{
		FlightMovementComponent->SetRollInput(Value.Get<float>());
	}
}

void ASkyAircraftBase::HandleYawInput(const FInputActionValue& Value)
{
	if (FlightMovementComponent)
	{
		FlightMovementComponent->SetYawInput(Value.Get<float>());
	}
}

void ASkyAircraftBase::HandleThrottleInput(const FInputActionValue& Value)
{
	if (FlightMovementComponent)
	{
		FlightMovementComponent->SetThrottleInput(Value.Get<float>());
	}
}

void ASkyAircraftBase::HandleBoostInput(const FInputActionValue& Value)
{
	if (FlightMovementComponent)
	{
		FlightMovementComponent->SetAfterburnerActive(Value.Get<bool>());
	}
}

void ASkyAircraftBase::HandleAirbrakeInput(const FInputActionValue& Value)
{
	if (FlightMovementComponent)
	{
		FlightMovementComponent->SetAirbrakeActive(Value.Get<bool>());
	}
}

void ASkyAircraftBase::HandleFireCannon(const FInputActionValue& Value)
{
	// Combat component will bind to this in Phase 4
	UE_LOG(LogSkyDominator, Verbose, TEXT("Rotary Cannon Triggered"));
}

void ASkyAircraftBase::HandleFireMissile(const FInputActionValue& Value)
{
	// Combat component will bind to this in Phase 4
	UE_LOG(LogSkyDominator, Verbose, TEXT("Missile Triggered"));
}

void ASkyAircraftBase::HandleSpecialAbility(const FInputActionValue& Value)
{
	UE_LOG(LogSkyDominator, Log, TEXT("Special Ability Triggered"));
}

void ASkyAircraftBase::HandleAircraftDestroyed(AActor* DestroyedActor)
{
	UE_LOG(LogSkyDominator, Warning, TEXT("Aircraft Destroyed! Triggering cinematic defeat sequence."));
	SetActorEnableCollision(false);
}

