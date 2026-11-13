#pragma once

#include "CoreMinimal.h"
#include "Engine/DataTable.h"
#include "SkyDominatorTypes.generated.h"

/**
 * 12 Aircraft Classification Identities
 */
UENUM(BlueprintType)
enum class EAircraftClass : uint8
{
	StealthInterceptor       UMETA(DisplayName = "Stealth Interceptor"),
	HeavyStrikeFighter       UMETA(DisplayName = "Heavy Strike Fighter"),
	AdvancedMultirole        UMETA(DisplayName = "Advanced Multirole Fighter"),
	HighSpeedExperimental    UMETA(DisplayName = "High-Speed Experimental Jet"),
	NavalFighter             UMETA(DisplayName = "Naval Fighter"),
	ElectronicDefense        UMETA(DisplayName = "Electronic Defense Fighter"),
	TacticalRecon            UMETA(DisplayName = "Tactical Reconnaissance Jet"),
	EliteSquadron            UMETA(DisplayName = "Elite Squadron Fighter"),
	FuturisticHypersonic     UMETA(DisplayName = "Futuristic Hypersonic Concept"),
	HeavyArmored             UMETA(DisplayName = "Heavy Armored Aircraft"),
	LegendaryPhantom         UMETA(DisplayName = "Legendary Phantom Fighter"),
	UltimateApex             UMETA(DisplayName = "Ultimate Apex Aircraft")
};

/**
 * Flight Simulation Handling Profiles
 */
UENUM(BlueprintType)
enum class EFlightHandlingProfile : uint8
{
	Beginner    UMETA(DisplayName = "Beginner (Flight Assisted)"),
	Advanced    UMETA(DisplayName = "Advanced (Combat Tuned)"),
	Simulation  UMETA(DisplayName = "Simulation (True Aerodynamics)")
};

/**
 * Structural Aircraft Damage Zones
 */
UENUM(BlueprintType)
enum class EDamageZone : uint8
{
	Hull            UMETA(DisplayName = "General Hull"),
	CockpitAvionics UMETA(DisplayName = "Cockpit & Radar Avionics"),
	LeftWing        UMETA(DisplayName = "Left Wing"),
	RightWing       UMETA(DisplayName = "Right Wing"),
	LeftEngine      UMETA(DisplayName = "Left Turbine Engine"),
	RightEngine     UMETA(DisplayName = "Right Turbine Engine"),
	ControlSurfaces UMETA(DisplayName = "Rudders & Elevons")
};

/**
 * Weapon Mounting Slots
 */
UENUM(BlueprintType)
enum class EWeaponSlot : uint8
{
	Cannon          UMETA(DisplayName = "Rotary Kinetic Cannon"),
	PrimaryMissiles UMETA(DisplayName = "Radar Guided Missiles"),
	SpecialAbility  UMETA(DisplayName = "Signature Ability Module"),
	Countermeasures UMETA(DisplayName = "Flares & ECM Chaff")
};

/**
 * Battlefield Collectible Boosters
 */
UENUM(BlueprintType)
enum class EBoosterType : uint8
{
	HealthBooster        UMETA(DisplayName = "Nanite Health Booster"),
	ArmorBooster         UMETA(DisplayName = "Deflection Armor Booster"),
	EnergyBooster        UMETA(DisplayName = "Afterburner Energy Booster"),
	ShieldBooster        UMETA(DisplayName = "Aegis Shield Booster"),
	EmergencyRepair      UMETA(DisplayName = "Emergency Subsystem Repair"),
	ExtraLife            UMETA(DisplayName = "Tactical Extra Life")
};

/**
 * Mission Operational State
 */
UENUM(BlueprintType)
enum class EMissionStatus : uint8
{
	Locked          UMETA(DisplayName = "Locked"),
	Available       UMETA(DisplayName = "Available"),
	InProgress      UMETA(DisplayName = "In Progress"),
	Completed       UMETA(DisplayName = "Completed"),
	Failed          UMETA(DisplayName = "Failed")
};

/**
 * Aircraft Performance & Aerodynamic Characteristics
 */
USTRUCT(BlueprintType)
struct FAircraftFlightStats
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Flight Stats")
	float MaxSpeedMach = 2.4f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Flight Stats")
	float CruiseSpeedKts = 450.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Flight Stats")
	float StallSpeedKts = 140.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Flight Stats")
	float ThrustPowerNewtons = 150000.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Flight Stats")
	float AfterburnerMultiplier = 1.6f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Flight Stats")
	float PitchRateDegPerSec = 45.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Flight Stats")
	float RollRateDegPerSec = 160.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Flight Stats")
	float YawRateDegPerSec = 25.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Flight Stats")
	float MaxGForceTolerance = 9.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Flight Stats")
	float MaxServiceCeilingMeters = 20000.0f;
};

/**
 * Armor and Durability Attributes
 */
USTRUCT(BlueprintType)
struct FAircraftDurabilityStats
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Durability Stats")
	float MaxHullIntegrity = 1000.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Durability Stats")
	float ArmorMitigationPercent = 15.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Durability Stats")
	float MaxShieldCapacity = 300.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Durability Stats")
	float BoostEnergyMax = 100.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Durability Stats")
	float BoostRechargeRatePerSec = 10.0f;
};

/**
 * Aircraft Visual Customization Setup
 */
USTRUCT(BlueprintType)
struct FAircraftCustomization
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Customization")
	int32 SkinIndex = 0;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Customization")
	FLinearColor PrimaryColor = FLinearColor(0.02f, 0.05f, 0.08f, 1.0f); // Stealth Dark

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Customization")
	FLinearColor AccentColor = FLinearColor(0.0f, 0.8f, 1.0f, 1.0f);   // Cyber Cyan

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Customization")
	FName DecalBadgeID = NAME_None;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Customization")
	int32 EngineVFXStyle = 0;
};

/**
 * Mission Objective Specification
 */
USTRUCT(BlueprintType)
struct FMissionObjective
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Objective")
	FName ObjectiveID = NAME_None;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Objective")
	FText Title;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Objective")
	FText Description;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Objective")
	bool bIsMandatory = true;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Objective")
	int32 RequiredTargetCount = 1;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Objective")
	int32 CurrentTargetCount = 0;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Objective")
	bool bIsCompleted = false;
};

