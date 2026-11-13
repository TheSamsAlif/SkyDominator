#include "Progression/SkyProgressionSubsystem.h"
#include "Kismet/GameplayStatics.h"
#include "SkyDominator.h"

void USkyProgressionSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);
	LoadProgress();
}

void USkyProgressionSubsystem::Deinitialize()
{
	SaveProgress();
	Super::Deinitialize();
}

void USkyProgressionSubsystem::LoadProgress()
{
	const FString SlotName = TEXT("SkyDominatorProfile_0");
	if (UGameplayStatics::DoesSaveGameExist(SlotName, 0))
	{
		ActiveSaveGame = Cast<USkySaveGame>(UGameplayStatics::LoadGameFromSlot(SlotName, 0));
	}

	if (!ActiveSaveGame)
	{
		ActiveSaveGame = Cast<USkySaveGame>(UGameplayStatics::CreateSaveGameObject(USkySaveGame::StaticClass()));
		SaveProgress();
	}
}

void USkyProgressionSubsystem::SaveProgress()
{
	if (ActiveSaveGame)
	{
		UGameplayStatics::SaveGameToSlot(ActiveSaveGame, TEXT("SkyDominatorProfile_0"), 0);
	}
}

void USkyProgressionSubsystem::AddXP(int32 Amount)
{
	if (!ActiveSaveGame || Amount <= 0) return;

	ActiveSaveGame->CurrentXP += Amount;
	CheckForLevelUp();
	OnXPChanged.Broadcast(ActiveSaveGame->CurrentXP, ActiveSaveGame->PlayerLevel);
	SaveProgress();
}

void USkyProgressionSubsystem::CheckForLevelUp()
{
	if (!ActiveSaveGame) return;

	while (ActiveSaveGame->CurrentXP >= CalculateRequiredXPForLevel(ActiveSaveGame->PlayerLevel))
	{
		ActiveSaveGame->CurrentXP -= CalculateRequiredXPForLevel(ActiveSaveGame->PlayerLevel);
		ActiveSaveGame->PlayerLevel++;
		UE_LOG(LogSkyDominator, Log, TEXT("Level Up! New Player Level: %d"), ActiveSaveGame->PlayerLevel);
	}
}

int32 USkyProgressionSubsystem::CalculateRequiredXPForLevel(int32 Level) const
{
	return 1000 + (Level * 500);
}

void USkyProgressionSubsystem::AddCredits(int32 Amount)
{
	if (!ActiveSaveGame || Amount <= 0) return;

	ActiveSaveGame->Credits += Amount;
	OnCreditsChanged.Broadcast(ActiveSaveGame->Credits);
	SaveProgress();
}

bool USkyProgressionSubsystem::SpendCredits(int32 Amount)
{
	if (!ActiveSaveGame || Amount <= 0 || ActiveSaveGame->Credits < Amount)
	{
		return false;
	}

	ActiveSaveGame->Credits -= Amount;
	OnCreditsChanged.Broadcast(ActiveSaveGame->Credits);
	SaveProgress();
	return true;
}

bool USkyProgressionSubsystem::UnlockAircraft(FName AircraftID, int32 CostCredits)
{
	if (!ActiveSaveGame || IsAircraftUnlocked(AircraftID))
	{
		return false;
	}

	if (SpendCredits(CostCredits))
	{
		ActiveSaveGame->UnlockedAircraftIDs.Add(AircraftID);
		OnAircraftUnlocked.Broadcast(AircraftID);
		SaveProgress();
		return true;
	}

	return false;
}

bool USkyProgressionSubsystem::IsAircraftUnlocked(FName AircraftID) const
{
	if (!ActiveSaveGame) return false;
	return ActiveSaveGame->UnlockedAircraftIDs.Contains(AircraftID);
}

void USkyProgressionSubsystem::SelectAircraft(FName AircraftID)
{
	if (!ActiveSaveGame || !IsAircraftUnlocked(AircraftID)) return;

	ActiveSaveGame->SelectedAircraftID = AircraftID;
	OnAircraftSelected.Broadcast(AircraftID);
	SaveProgress();
}

FName USkyProgressionSubsystem::GetSelectedAircraftID() const
{
	return ActiveSaveGame ? ActiveSaveGame->SelectedAircraftID : TEXT("A01_ApexPhantom");
}

int32 USkyProgressionSubsystem::GetPlayerLevel() const
{
	return ActiveSaveGame ? ActiveSaveGame->PlayerLevel : 1;
}

int32 USkyProgressionSubsystem::GetCurrentXP() const
{
	return ActiveSaveGame ? ActiveSaveGame->CurrentXP : 0;
}

int32 USkyProgressionSubsystem::GetCredits() const
{
	return ActiveSaveGame ? ActiveSaveGame->Credits : 0;
}

