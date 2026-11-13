#include "SaveSystem/SkySaveGame.h"

USkySaveGame::USkySaveGame()
	: SaveSlotName(TEXT("SkyDominatorProfile_0"))
	, UserIndex(0)
	, PilotName(TEXT("Viper 1"))
	, PlayerLevel(1)
	, CurrentXP(0)
	, Credits(5000)
	, SelectedAircraftID(TEXT("A01_ApexPhantom"))
	, HandlingProfile(EFlightHandlingProfile::Advanced)
	, bInvertFlightPitch(false)
	, FlightControlSensitivity(1.0f)
	, MasterVolume(1.0f)
	, MusicVolume(0.85f)
	, SFXVolume(0.9f)
	, GraphicsQualityPreset(3) // 3 = High
{
	UnlockedAircraftIDs.Add(TEXT("A01_ApexPhantom"));
	MissionProgress.Add(TEXT("M01_FirstFlight"), EMissionStatus::Available);
}

