#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "SkyDominatorTypes.h"
#include "SaveSystem/SkySaveGame.h"
#include "SkyProgressionSubsystem.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnXPChangedSignature, int32, NewXP, int32, CurrentLevel);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnCreditsChangedSignature, int32, NewCredits);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnAircraftUnlockedSignature, FName, AircraftID);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnAircraftSelectedSignature, FName, AircraftID);

/**
 * GameInstance Subsystem managing persistent progression, credits, XP, and aircraft ownership
 */
UCLASS()
class SKYDOMINATOR_API USkyProgressionSubsystem : public UGameInstanceSubsystem
{
	GENERATED_BODY()

public:
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;
	virtual void Deinitialize() override;

	UFUNCTION(BlueprintCallable, Category = "Progression")
	void AddXP(int32 Amount);

	UFUNCTION(BlueprintCallable, Category = "Progression")
	void AddCredits(int32 Amount);

	UFUNCTION(BlueprintCallable, Category = "Progression")
	bool SpendCredits(int32 Amount);

	UFUNCTION(BlueprintCallable, Category = "Progression")
	bool UnlockAircraft(FName AircraftID, int32 CostCredits);

	UFUNCTION(BlueprintCallable, Category = "Progression")
	bool IsAircraftUnlocked(FName AircraftID) const;

	UFUNCTION(BlueprintCallable, Category = "Progression")
	void SelectAircraft(FName AircraftID);

	UFUNCTION(BlueprintPure, Category = "Progression")
	FName GetSelectedAircraftID() const;

	UFUNCTION(BlueprintPure, Category = "Progression")
	int32 GetPlayerLevel() const;

	UFUNCTION(BlueprintPure, Category = "Progression")
	int32 GetCurrentXP() const;

	UFUNCTION(BlueprintPure, Category = "Progression")
	int32 GetCredits() const;

	UFUNCTION(BlueprintCallable, Category = "Progression")
	void SaveProgress();

	UFUNCTION(BlueprintCallable, Category = "Progression")
	void LoadProgress();

	UPROPERTY(BlueprintAssignable, Category = "Progression|Delegates")
	FOnXPChangedSignature OnXPChanged;

	UPROPERTY(BlueprintAssignable, Category = "Progression|Delegates")
	FOnCreditsChangedSignature OnCreditsChanged;

	UPROPERTY(BlueprintAssignable, Category = "Progression|Delegates")
	FOnAircraftUnlockedSignature OnAircraftUnlocked;

	UPROPERTY(BlueprintAssignable, Category = "Progression|Delegates")
	FOnAircraftSelectedSignature OnAircraftSelected;

protected:
	UPROPERTY()
	TObjectPtr<USkySaveGame> ActiveSaveGame;

	int32 CalculateRequiredXPForLevel(int32 Level) const;
	void CheckForLevelUp();
};

