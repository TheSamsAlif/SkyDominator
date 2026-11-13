using UnrealBuildTool;

public class SkyDominator : ModuleRules
{
	public SkyDominator(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

		PublicDependencyModuleNames.AddRange(new string[] {
			"Core",
			"CoreUObject",
			"Engine",
			"InputCore",
			"EnhancedInput",
			"UMG",
			"Slate",
			"SlateCore",
			"Niagara",
			"MetasoundEngine",
			"CommonUI",
			"DeveloperSettings"
		});

		PrivateDependencyModuleNames.AddRange(new string[] {
			"RenderCore",
			"RHI"
		});

		PublicIncludePaths.AddRange(new string[] {
			"SkyDominator"
		});
	}
}

