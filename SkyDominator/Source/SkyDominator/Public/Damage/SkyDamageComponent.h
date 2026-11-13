#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "SkyDominatorTypes.h"
#include "SkyDamageComponent.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnHealthChangedSignature, float, CurrentHealth, float, MaxHealth);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnShieldChangedSignature, float, CurrentShield, float, MaxShield);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnSubsystemDamagedSignature, EDamageZone, Zone, float, RemainingIntegrity);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnAircraftDestroyedSignature, AActor*, DestroyedActor);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnBoosterCollectedSignature, EBoosterType, BoosterType);

/**
 * Aircraft Damage, Health, Armor, Subsystems, and Collectibles Component
 */
UCLASS(ClassGroup=(Custom), meta=(BlueprintSpawnableComponent))
class SKYDOMINATOR_API USkyDamageComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	USkyDamageComponent();

	virtual void BeginPlay() override;
	virtual void TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction) override;

	UFUNCTION(BlueprintCallable, Category = "Damage & Health")
	void InitializeDamageStats(const FAircraftDurabilityStats& InStats);

	UFUNCTION(BlueprintCallable, Category = "Damage & Health")
	void ApplyDamageToZone(float DamageAmount, EDamageZone Zone, AActor* DamageCauser);

	// Collectible Boosters
	UFUNCTION(BlueprintCallable, Category = "Collectibles")
	void ApplyBooster(EBoosterType BoosterType);

	// Getters for HUD
	UFUNCTION(BlueprintPure, Category = "Damage & Health")
	float GetHealthPercent() const;

	UFUNCTION(BlueprintPure, Category = "Damage & Health")
	float GetShieldPercent() const;

	UFUNCTION(BlueprintPure, Category = "Damage & Health")
	int32 GetRemainingLives() const { return RemainingLives; }

	UFUNCTION(BlueprintPure, Category = "Damage & Health")
	bool IsDestroyed() const { return bIsDestroyed; }

	UFUNCTION(BlueprintPure, Category = "Damage & Health")
	bool IsEngineDamaged() const { return bEngineDamaged; }

	UFUNCTION(BlueprintPure, Category = "Damage & Health")
	bool IsWingDamaged() const { return bWingDamaged; }

	UPROPERTY(BlueprintAssignable, Category = "Damage|Events")
	FOnHealthChangedSignature OnHealthChanged;

	UPROPERTY(BlueprintAssignable, Category = "Damage|Events")
	FOnShieldChangedSignature OnShieldChanged;

	UPROPERTY(BlueprintAssignable, Category = "Damage|Events")
	FOnSubsystemDamagedSignature OnSubsystemDamaged;

	UPROPERTY(BlueprintAssignable, Category = "Damage|Events")
	FOnAircraftDestroyedSignature OnAircraftDestroyed;

	UPROPERTY(BlueprintAssignable, Category = "Damage|Events")
	FOnBoosterCollectedSignature OnBoosterCollected;

protected:
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Durability")
	FAircraftDurabilityStats DurabilityStats;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "State")
	float CurrentHealth = 1000.0f;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "State")
	float CurrentShield = 300.0f;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "State")
	int32 RemainingLives = 3;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "State")
	bool bIsDestroyed = false;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "State")
	bool bEngineDamaged = false;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "State")
	bool bWingDamaged = false;

	// Subsystem Integrities (0.0 to 100.0)
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Subsystems")
	TMap<EDamageZone, float> SubsystemIntegrity;

	float ArmorBoostTimer = 0.0f;
	float TemporaryArmorBonus = 0.0f;
};

