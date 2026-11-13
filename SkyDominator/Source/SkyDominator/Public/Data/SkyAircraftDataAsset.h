#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "SkyDominatorTypes.h"
#include "SkyAircraftDataAsset.generated.h"

class USkeletalMesh;
class UStaticMesh;
class UMaterialInterface;
class USoundBase;

/**
 * UDataAsset representing an individual Aircraft configuration in Sky Dominator
 */
UCLASS(BlueprintType)
class SKYDOMINATOR_API USkyAircraftDataAsset : public UPrimaryDataAsset
{
	GENERATED_BODY()

public:
	USkyAircraftDataAsset();

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Identity")
	FName AircraftID;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Identity")
	FText DisplayName;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Identity")
	FText LoreDescription;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Identity")
	EAircraftClass AircraftClass;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Visuals")
	TSoftObjectPtr<USkeletalMesh> AircraftSkeletalMesh;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Visuals")
	TSoftObjectPtr<UStaticMesh> CockpitInteriorMesh;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Visuals")
	TArray<TSoftObjectPtr<UMaterialInterface>> AvailableSkins;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Flight Dynamics")
	FAircraftFlightStats FlightStats;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Durability & Systems")
	FAircraftDurabilityStats DurabilityStats;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Special Ability")
	FName SpecialAbilityID;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Special Ability")
	FText SpecialAbilityName;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Special Ability")
	FText SpecialAbilityDescription;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Special Ability")
	float SpecialAbilityDurationSeconds;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Special Ability")
	float SpecialAbilityCooldownSeconds;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Audio")
	TSoftObjectPtr<USoundBase> EngineAudioMetaSound;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Economy & Unlocks")
	int32 PurchaseCostCredits;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Economy & Unlocks")
	int32 RequiredPlayerLevel;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Economy & Unlocks")
	bool bUnlockedByDefault;

	virtual FPrimaryAssetId GetPrimaryAssetId() const override;
};

