#include "Core/SkyDominatorGameModeBase.h"
#include "Aircraft/SkyAircraftBase.h"
#include "Data/SkyMissionDataAsset.h"
#include "Data/SkyAircraftDataAsset.h"
#include "Progression/SkyProgressionSubsystem.h"
#include "Kismet/GameplayStatics.h"
#include "SkyDominator.h"

ASkyDominatorGameModeBase::ASkyDominatorGameModeBase()
{
	PrimaryActorTick.bCanEverTick = true;
	DefaultPawnClass = ASkyAircraftBase::StaticClass();
}

void ASkyDominatorGameModeBase::BeginPlay()
{
	Super::BeginPlay();

	if (ActiveMissionData)
	{
		StartMission(ActiveMissionData);
	}
}

void ASkyDominatorGameModeBase::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	if (CurrentMissionStatus == EMissionStatus::InProgress)
	{
		MissionElapsedTime += DeltaSeconds;
	}
}

void ASkyDominatorGameModeBase::RestartPlayer(AController* NewPlayer)
{
	Super::RestartPlayer(NewPlayer);

	// Fetch selected aircraft from progression subsystem
	if (UGameInstance* GI = GetGameInstance())
	{
		if (USkyProgressionSubsystem* Progression = GI->GetSubsystem<USkyProgressionSubsystem>())
		{
			const FName SelectedID = Progression->GetSelectedAircraftID();
			UE_LOG(LogSkyDominator, Log, TEXT("Spawning player with selected aircraft identity: %s"), *SelectedID.ToString());
		}
	}
}

void ASkyDominatorGameModeBase::StartMission(USkyMissionDataAsset* InMissionData)
{
	if (!InMissionData) return;

	ActiveMissionData = InMissionData;
	CurrentMissionStatus = EMissionStatus::InProgress;
	MissionElapsedTime = 0.0f;
	CurrentMissionScore = 0;

	OnMissionStatusChanged.Broadcast(CurrentMissionStatus);
	UE_LOG(LogSkyDominator, Log, TEXT("Mission Started: %s"), *ActiveMissionData->MissionTitle.ToString());
}

void ASkyDominatorGameModeBase::UpdateObjectiveProgress(FName ObjectiveID, int32 Increment)
{
	if (!ActiveMissionData || CurrentMissionStatus != EMissionStatus::InProgress) return;

	for (FMissionObjective& Obj : ActiveMissionData->Objectives)
	{
		if (Obj.ObjectiveID == ObjectiveID && !Obj.bIsCompleted)
		{
			Obj.CurrentTargetCount += Increment;
			CurrentMissionScore += (100 * Increment);

			if (Obj.CurrentTargetCount >= Obj.RequiredTargetCount)
			{
				Obj.bIsCompleted = true;
				OnObjectiveProgress.Broadcast(ObjectiveID, true);
				UE_LOG(LogSkyDominator, Log, TEXT("Objective %s Completed!"), *ObjectiveID.ToString());
			}
			else
			{
				OnObjectiveProgress.Broadcast(ObjectiveID, false);
			}
			break;
		}
	}

	CheckMandatoryObjectivesComplete();
}

void ASkyDominatorGameModeBase::CheckMandatoryObjectivesComplete()
{
	if (!ActiveMissionData) return;

	bool bAllMandatoryDone = true;
	for (const FMissionObjective& Obj : ActiveMissionData->Objectives)
	{
		if (Obj.bIsMandatory && !Obj.bIsCompleted)
		{
			bAllMandatoryDone = false;
			break;
		}
	}

	if (bAllMandatoryDone)
	{
		CompleteMission();
	}
}

void ASkyDominatorGameModeBase::CompleteMission()
{
	if (CurrentMissionStatus != EMissionStatus::InProgress) return;

	CurrentMissionStatus = EMissionStatus::Completed;
	OnMissionStatusChanged.Broadcast(CurrentMissionStatus);

	// Distribute rewards via Progression Subsystem
	if (UGameInstance* GI = GetGameInstance())
	{
		if (USkyProgressionSubsystem* Progression = GI->GetSubsystem<USkyProgressionSubsystem>())
		{
			if (ActiveMissionData)
			{
				Progression->AddCredits(ActiveMissionData->CompletionCreditsReward);
				Progression->AddXP(ActiveMissionData->CompletionXPReward);
			}
		}
	}

	UE_LOG(LogSkyDominator, Log, TEXT("Mission Completed with Score: %d!"), CurrentMissionScore);
}

void ASkyDominatorGameModeBase::FailMission(const FText& FailureReason)
{
	if (CurrentMissionStatus != EMissionStatus::InProgress) return;

	CurrentMissionStatus = EMissionStatus::Failed;
	OnMissionStatusChanged.Broadcast(CurrentMissionStatus);
	UE_LOG(LogSkyDominator, Warning, TEXT("Mission Failed: %s"), *FailureReason.ToString());
}

