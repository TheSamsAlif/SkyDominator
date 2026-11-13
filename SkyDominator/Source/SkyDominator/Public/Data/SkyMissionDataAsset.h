#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "SkyDominatorTypes.h"
#include "SkyMissionDataAsset.generated.h"

/**
 * DataAsset configuring a Story Campaign or Free Flight Mission
 */
UCLASS(BlueprintType)
class SKYDOMINATOR_API USkyMissionDataAsset : public UPrimaryDataAsset
{
	GENERATED_BODY()

public:
	USkyMissionDataAsset();

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Mission Identity")
	FName MissionID;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Mission Identity")
	int32 ChapterNumber;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Mission Identity")
	FText MissionTitle;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Mission Identity")
	FText LocationName;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Mission Briefing")
	FText BriefingOverview;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Mission Briefing")
	TArray<FMissionObjective> Objectives;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Level")
	TSoftObjectPtr<UWorld> TargetLevel;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Rewards")
	int32 CompletionCreditsReward;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Rewards")
	int32 CompletionXPReward;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Recommendations")
	EAircraftClass RecommendedAircraftClass;

	virtual FPrimaryAssetId GetPrimaryAssetId() const override;
};

