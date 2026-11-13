#include "SkyDominator.h"

DEFINE_LOG_CATEGORY(LogSkyDominator);

void FSkyDominatorModule::StartupModule()
{
	UE_LOG(LogSkyDominator, Log, TEXT("SkyDominator Module Initialized. Welcome to Apex Strike."));
}

void FSkyDominatorModule::ShutdownModule()
{
	UE_LOG(LogSkyDominator, Log, TEXT("SkyDominator Module Shutting Down."));
}

IMPLEMENT_PRIMARY_GAME_MODULE(FSkyDominatorModule, SkyDominator, "SkyDominator");

