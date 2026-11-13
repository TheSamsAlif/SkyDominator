#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "SkyDominatorTypes.h"
#include "SkyDominatorGameModeBase.generated.h"

class USkyMissionDataAsset;
class USkyAircraftDataAsset;
class ASkyAircraftBase;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnMissionStatusChangedSignature, EMissionStatus, NewStatus);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnObjectiveProgressSignature, FName, ObjectiveID, bool, bCompleted);

/**
 * Base GameMode for Aerial Combat Missions in Sky Dominator
 */
UCLASS()
class SKYDOMINATOR_API ASkyDominatorGameModeBase : public AGameModeBase
{
	GENERATED_BODY()

public:
	ASkyDominatorGameModeBase();

	virtual void BeginPlay() override;
	virtual void RestartPlayer(AController* NewPlayer) override;

	UFUNCTION(BlueprintCallable, Category = "Mission Control")
	void StartMission(USkyMissionDataAsset* InMissionData);

	UFUNCTION(BlueprintCallable, Category = "Mission Control")
	void UpdateObjectiveProgress(FName ObjectiveID, int32 Increment);

	UFUNCTION(BlueprintCallable, Category = "Mission Control")
	void CompleteMission();

	UFUNCTION(BlueprintCallable, Category = "Mission Control")
	void FailMission(const FText& FailureReason);

	UFUNCTION(BlueprintPure, Category = "Mission Control")
	EMissionStatus GetMissionStatus() const { return CurrentMissionStatus; }

	UFUNCTION(BlueprintPure, Category = "Mission Control")
	int32 GetMissionScore() const { return CurrentMissionScore; }

	UFUNCTION(BlueprintPure, Category = "Mission Control")
	float GetMissionElapsedTime() const { return MissionElapsedTime; }

	UPROPERTY(BlueprintAssignable, Category = "Mission|Events")
	FOnMissionStatusChangedSignature OnMissionStatusChanged;

	UPROPERTY(BlueprintAssignable, Category = "Mission|Events")
	FOnObjectiveProgressSignature OnObjectiveProgress;

protected:
	virtual void Tick(float DeltaSeconds) override;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Mission Setup")
	TObjectPtr<USkyMissionDataAsset> ActiveMissionData;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Mission State")
	EMissionStatus CurrentMissionStatus = EMissionStatus::NotStarted;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Mission State")
	int32 CurrentMissionScore = 0;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Mission State")
	float MissionElapsedTime = 0.0f;

	void CheckMandatoryObjectivesComplete();
};

