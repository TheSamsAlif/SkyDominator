#include "Data/SkyMissionDataAsset.h"

USkyMissionDataAsset::USkyMissionDataAsset()
	: MissionID(TEXT("M01_FirstFlight"))
	, ChapterNumber(1)
	, MissionTitle(NSLOCTEXT("SkyDominator", "M01Title", "Chapter 01: First Flight"))
	, LocationName(NSLOCTEXT("SkyDominator", "M01Loc", "Apex Atoll Tactical Range"))
	, BriefingOverview(NSLOCTEXT("SkyDominator", "M01Desc", "Conduct basic aerodynamic trials, navigate canyon checkpoints, and engage simulated aerial combat drones."))
	, CompletionCreditsReward(2500)
	, CompletionXPReward(1000)
	, RecommendedAircraftClass(EAircraftClass::StealthInterceptor)
{
}

FPrimaryAssetId USkyMissionDataAsset::GetPrimaryAssetId() const
{
	return FPrimaryAssetId(TEXT("Mission"), MissionID);
}

