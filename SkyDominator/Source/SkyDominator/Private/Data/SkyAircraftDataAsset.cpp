#include "Data/SkyAircraftDataAsset.h"

USkyAircraftDataAsset::USkyAircraftDataAsset()
	: AircraftID(TEXT("A01_ApexPhantom"))
	, DisplayName(NSLOCTEXT("SkyDominator", "ApexPhantomName", "Apex Phantom"))
	, LoreDescription(NSLOCTEXT("SkyDominator", "ApexPhantomDesc", "Next-generation 6th-gen stealth interceptor with adaptive low-RCS geometry and active radar cloaking."))
	, AircraftClass(EAircraftClass::StealthInterceptor)
	, SpecialAbilityID(TEXT("ActiveCloak"))
	, SpecialAbilityName(NSLOCTEXT("SkyDominator", "ActiveCloakName", "Active Cloak"))
	, SpecialAbilityDescription(NSLOCTEXT("SkyDominator", "ActiveCloakDesc", "Suppresses active radar returns and thermal heat signatures, breaking missile locks for 8 seconds."))
	, SpecialAbilityDurationSeconds(8.0f)
	, SpecialAbilityCooldownSeconds(30.0f)
	, PurchaseCostCredits(0)
	, RequiredPlayerLevel(1)
	, bUnlockedByDefault(true)
{
}

FPrimaryAssetId USkyAircraftDataAsset::GetPrimaryAssetId() const
{
	return FPrimaryAssetId(TEXT("Aircraft"), AircraftID);
}

