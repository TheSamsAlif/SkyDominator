#pragma once

#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "SkyDominatorTypes.h"
#include "SkySaveGame.generated.h"

/**
 * Persisted player save state for Sky Dominator: Apex Strike
 */
UCLASS()
class SKYDOMINATOR_API USkySaveGame : public USaveGame
{
	GENERATED_BODY()

public:
	USkySaveGame();

	UPROPERTY(VisibleAnywhere, BlueprintReadWrite, Category = "Save Slot")
	FString SaveSlotName;

	UPROPERTY(VisibleAnywhere, BlueprintReadWrite, Category = "Save Slot")
	uint32 UserIndex;

	UPROPERTY(VisibleAnywhere, BlueprintReadWrite, Category = "Player Profile")
	FString PilotName;

	UPROPERTY(VisibleAnywhere, BlueprintReadWrite, Category = "Player Profile")
	int32 PlayerLevel;

	UPROPERTY(VisibleAnywhere, BlueprintReadWrite, Category = "Player Profile")
	int32 CurrentXP;

	UPROPERTY(VisibleAnywhere, BlueprintReadWrite, Category = "Player Profile")
	int32 Credits;

	UPROPERTY(VisibleAnywhere, BlueprintReadWrite, Category = "Hangar")
	FName SelectedAircraftID;

	UPROPERTY(VisibleAnywhere, BlueprintReadWrite, Category = "Hangar")
	TArray<FName> UnlockedAircraftIDs;

	UPROPERTY(VisibleAnywhere, BlueprintReadWrite, Category = "Hangar")
	TMap<FName, FAircraftCustomization> AircraftCustomizations;

	UPROPERTY(VisibleAnywhere, BlueprintReadWrite, Category = "Campaign")
	TMap<FName, EMissionStatus> MissionProgress;

	UPROPERTY(VisibleAnywhere, BlueprintReadWrite, Category = "Campaign")
	TMap<FName, int32> MissionHighScores;

	UPROPERTY(VisibleAnywhere, BlueprintReadWrite, Category = "Settings")
	EFlightHandlingProfile HandlingProfile;

	UPROPERTY(VisibleAnywhere, BlueprintReadWrite, Category = "Settings")
	bool bInvertFlightPitch;

	UPROPERTY(VisibleAnywhere, BlueprintReadWrite, Category = "Settings")
	float FlightControlSensitivity;

	UPROPERTY(VisibleAnywhere, BlueprintReadWrite, Category = "Settings")
	float MasterVolume;

	UPROPERTY(VisibleAnywhere, BlueprintReadWrite, Category = "Settings")
	float MusicVolume;

	UPROPERTY(VisibleAnywhere, BlueprintReadWrite, Category = "Settings")
	float SFXVolume;

	UPROPERTY(VisibleAnywhere, BlueprintReadWrite, Category = "Settings")
	int32 GraphicsQualityPreset;
};

