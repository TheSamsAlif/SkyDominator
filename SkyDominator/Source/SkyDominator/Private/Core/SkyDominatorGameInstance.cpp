#include "Core/SkyDominatorGameInstance.h"
#include "SkyDominator.h"

USkyDominatorGameInstance::USkyDominatorGameInstance()
{
}

void USkyDominatorGameInstance::Init()
{
	Super::Init();
	UE_LOG(LogSkyDominator, Log, TEXT("USkyDominatorGameInstance Initialized successfully."));
}

void USkyDominatorGameInstance::Shutdown()
{
	UE_LOG(LogSkyDominator, Log, TEXT("USkyDominatorGameInstance Shutting down."));
	Super::Shutdown();
}

