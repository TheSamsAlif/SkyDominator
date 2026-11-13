#include "Damage/SkyDamageComponent.h"
#include "SkyDominator.h"

USkyDamageComponent::USkyDamageComponent()
{
	PrimaryComponentTick.bCanEverTick = true;

	SubsystemIntegrity.Add(EDamageZone::Hull, 100.0f);
	SubsystemIntegrity.Add(EDamageZone::CockpitAvionics, 100.0f);
	SubsystemIntegrity.Add(EDamageZone::LeftWing, 100.0f);
	SubsystemIntegrity.Add(EDamageZone::RightWing, 100.0f);
	SubsystemIntegrity.Add(EDamageZone::LeftEngine, 100.0f);
	SubsystemIntegrity.Add(EDamageZone::RightEngine, 100.0f);
	SubsystemIntegrity.Add(EDamageZone::ControlSurfaces, 100.0f);
}

void USkyDamageComponent::BeginPlay()
{
	Super::BeginPlay();
	CurrentHealth = DurabilityStats.MaxHullIntegrity;
	CurrentShield = DurabilityStats.MaxShieldCapacity;
}

void USkyDamageComponent::TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction)
{
	Super::TickComponent(DeltaTime, TickType, ThisTickFunction);

	if (ArmorBoostTimer > 0.0f)
	{
		ArmorBoostTimer -= DeltaTime;
		if (ArmorBoostTimer <= 0.0f)
		{
			TemporaryArmorBonus = 0.0f;
		}
	}
}

void USkyDamageComponent::InitializeDamageStats(const FAircraftDurabilityStats& InStats)
{
	DurabilityStats = InStats;
	CurrentHealth = DurabilityStats.MaxHullIntegrity;
	CurrentShield = DurabilityStats.MaxShieldCapacity;
}

void USkyDamageComponent::ApplyDamageToZone(float DamageAmount, EDamageZone Zone, AActor* DamageCauser)
{
	if (bIsDestroyed || DamageAmount <= 0.0f) return;

	// 1. Check Shield Absorption first
	float RemainingDamage = DamageAmount;
	if (CurrentShield > 0.0f)
	{
		if (CurrentShield >= RemainingDamage)
		{
			CurrentShield -= RemainingDamage;
			RemainingDamage = 0.0f;
		}
		else
		{
			RemainingDamage -= CurrentShield;
			CurrentShield = 0.0f;
		}
		OnShieldChanged.Broadcast(CurrentShield, DurabilityStats.MaxShieldCapacity);
	}

	if (RemainingDamage <= 0.0f) return;

	// 2. Armor Mitigation Calculation
	const float EffectiveArmor = FMath::Clamp(DurabilityStats.ArmorMitigationPercent + TemporaryArmorBonus, 0.0f, 85.0f);
	const float DamageToHull = RemainingDamage * (1.0f - (EffectiveArmor / 100.0f));

	// 3. Apply to Subsystem Integrity
	if (SubsystemIntegrity.Contains(Zone))
	{
		float& ZoneIntegrity = SubsystemIntegrity[Zone];
		ZoneIntegrity = FMath::Max(0.0f, ZoneIntegrity - (DamageToHull / 10.0f));
		OnSubsystemDamaged.Broadcast(Zone, ZoneIntegrity);

		if (Zone == EDamageZone::LeftEngine || Zone == EDamageZone::RightEngine)
		{
			if (ZoneIntegrity < 50.0f) bEngineDamaged = true;
		}
		if (Zone == EDamageZone::LeftWing || Zone == EDamageZone::RightWing)
		{
			if (ZoneIntegrity < 50.0f) bWingDamaged = true;
		}
	}

	// 4. Apply to Main Hull Health
	CurrentHealth = FMath::Max(0.0f, CurrentHealth - DamageToHull);
	OnHealthChanged.Broadcast(CurrentHealth, DurabilityStats.MaxHullIntegrity);

	if (CurrentHealth <= 0.0f)
	{
		bIsDestroyed = true;
		OnAircraftDestroyed.Broadcast(GetOwner());
		UE_LOG(LogSkyDominator, Warning, TEXT("Aircraft %s completely destroyed!"), *GetOwner()->GetName());
	}
}

void USkyDamageComponent::ApplyBooster(EBoosterType BoosterType)
{
	switch (BoosterType)
	{
	case EBoosterType::HealthBooster:
		CurrentHealth = FMath::Min(DurabilityStats.MaxHullIntegrity, CurrentHealth + (DurabilityStats.MaxHullIntegrity * 0.35f));
		OnHealthChanged.Broadcast(CurrentHealth, DurabilityStats.MaxHullIntegrity);
		break;

	case EBoosterType::ArmorBooster:
		TemporaryArmorBonus = 40.0f;
		ArmorBoostTimer = 15.0f;
		break;

	case EBoosterType::ShieldBooster:
		CurrentShield = DurabilityStats.MaxShieldCapacity;
		OnShieldChanged.Broadcast(CurrentShield, DurabilityStats.MaxShieldCapacity);
		break;

	case EBoosterType::EmergencyRepair:
		bEngineDamaged = false;
		bWingDamaged = false;
		for (auto& Elem : SubsystemIntegrity)
		{
			Elem.Value = 100.0f;
		}
		CurrentHealth = FMath::Min(DurabilityStats.MaxHullIntegrity, CurrentHealth + (DurabilityStats.MaxHullIntegrity * 0.20f));
		OnHealthChanged.Broadcast(CurrentHealth, DurabilityStats.MaxHullIntegrity);
		break;

	case EBoosterType::ExtraLife:
		RemainingLives++;
		break;

	default:
		break;
	}

	OnBoosterCollected.Broadcast(BoosterType);
}

float USkyDamageComponent::GetHealthPercent() const
{
	return DurabilityStats.MaxHullIntegrity > 0.0f ? (CurrentHealth / DurabilityStats.MaxHullIntegrity) : 0.0f;
}

float USkyDamageComponent::GetShieldPercent() const
{
	return DurabilityStats.MaxShieldCapacity > 0.0f ? (CurrentShield / DurabilityStats.MaxShieldCapacity) : 0.0f;
}

