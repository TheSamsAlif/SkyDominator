#pragma once

#include "CoreMinimal.h"
#include "Engine/GameInstance.h"
#include "SkyDominatorGameInstance.generated.h"

class USkyAircraftDataAsset;

/**
 * GameInstance for Sky Dominator: Apex Strike
 */
UCLASS()
class SKYDOMINATOR_API USkyDominatorGameInstance : public UGameInstance
{
	GENERATED_BODY()

public:
	USkyDominatorGameInstance();

	virtual void Init() override;
	virtual void Shutdown() override;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Aircraft Catalog")
	TArray<TSoftObjectPtr<USkyAircraftDataAsset>> AircraftCatalog;
};

