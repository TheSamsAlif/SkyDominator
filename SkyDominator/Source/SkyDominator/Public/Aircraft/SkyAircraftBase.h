#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Pawn.h"
#include "InputActionValue.h"
#include "SkyDominatorTypes.h"
#include "SkyAircraftBase.generated.h"

class USkeletalMeshComponent;
class USpringArmComponent;
class UCameraComponent;
class USkyFlightMovementComponent;
class USkyDamageComponent;
class USkyAircraftDataAsset;
class UInputMappingContext;
class UInputAction;

/**
 * Base Aircraft Pawn for Player and AI in Sky Dominator: Apex Strike
 */
UCLASS()
class SKYDOMINATOR_API ASkyAircraftBase : public APawn
{
	GENERATED_BODY()

public:
	ASkyAircraftBase();

	virtual void BeginPlay() override;
	virtual void Tick(float DeltaTime) override;
	virtual void SetupPlayerInputComponent(class UInputComponent* PlayerInputComponent) override;

	UFUNCTION(BlueprintCallable, Category = "Aircraft")
	void ApplyAircraftData(USkyAircraftDataAsset* DataAsset);

	// Camera views
	UFUNCTION(BlueprintCallable, Category = "Camera")
	void CycleCameraView();

	// Component Getters
	USkyFlightMovementComponent* GetFlightMovement() const { return FlightMovementComponent; }
	USkyDamageComponent* GetDamageComponent() const { return DamageComponent; }

protected:
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Components")
	TObjectPtr<USkeletalMeshComponent> AircraftMesh;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Components")
	TObjectPtr<USpringArmComponent> SpringArm;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Components")
	TObjectPtr<UCameraComponent> ChaseCamera;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Components")
	TObjectPtr<UCameraComponent> CockpitCamera;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Components")
	TObjectPtr<USkyFlightMovementComponent> FlightMovementComponent;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Components")
	TObjectPtr<USkyDamageComponent> DamageComponent;

	// Enhanced Input Actions
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
	TObjectPtr<UInputMappingContext> DefaultMappingContext;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
	TObjectPtr<UInputAction> ActionPitch;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
	TObjectPtr<UInputAction> ActionRoll;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
	TObjectPtr<UInputAction> ActionYaw;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
	TObjectPtr<UInputAction> ActionThrottle;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
	TObjectPtr<UInputAction> ActionBoost;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
	TObjectPtr<UInputAction> ActionAirbrake;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
	TObjectPtr<UInputAction> ActionCycleCamera;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
	TObjectPtr<UInputAction> ActionFireCannon;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
	TObjectPtr<UInputAction> ActionFireMissile;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
	TObjectPtr<UInputAction> ActionSpecialAbility;

	// Input Handlers
	void HandlePitchInput(const FInputActionValue& Value);
	void HandleRollInput(const FInputActionValue& Value);
	void HandleYawInput(const FInputActionValue& Value);
	void HandleThrottleInput(const FInputActionValue& Value);
	void HandleBoostInput(const FInputActionValue& Value);
	void HandleAirbrakeInput(const FInputActionValue& Value);
	void HandleFireCannon(const FInputActionValue& Value);
	void HandleFireMissile(const FInputActionValue& Value);
	void HandleSpecialAbility(const FInputActionValue& Value);

	// Destruction Handler
	UFUNCTION()
	void HandleAircraftDestroyed(AActor* DestroyedActor);

	int32 ActiveCameraIndex = 0; // 0 = Chase, 1 = Cockpit
	float DefaultCameraFOV = 85.0f;
};

