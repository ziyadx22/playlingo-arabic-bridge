# Adds the MZGTA ReplayKit Broadcast Upload Extension target and embeds it in App. Idempotent.
require "xcodeproj"
proj = Xcodeproj::Project.open(ARGV[0] || "ios/App/App.xcodeproj")
app = proj.targets.find { |t| t.name == "App" } or abort "App target not found"
name = "MZGTABroadcast"
ext = proj.targets.find { |t| t.name == name }
unless ext
  ext = proj.new_target(:app_extension, name, :ios, "15.0", nil, :swift)
  group = proj.main_group.find_subpath(name, true)
  group.set_source_tree("SOURCE_ROOT"); group.set_path(name)
  ext.add_file_references([group.new_file("SampleHandler.swift")])
  group.new_file("Info.plist"); group.new_file("MZGTABroadcast.entitlements")
  %w[ReplayKit Vision].each { |fw| ext.add_system_framework(fw) }
  app.add_dependency(ext)
  embed = app.copy_files_build_phases.find { |p| p.name == "Embed App Extensions" } || app.new_copy_files_build_phase("Embed App Extensions")
  embed.dst_subfolder_spec = "13"
  build = embed.add_file_reference(ext.product_reference, true)
  build.settings = { "ATTRIBUTES" => ["RemoveHeadersOnCopy"] }
end
ext.build_configurations.each do |c|
  s = c.build_settings
  s["PRODUCT_BUNDLE_IDENTIFIER"] = "com.mzgta.app.MZGTABroadcast"
  s["INFOPLIST_FILE"] = "#{name}/Info.plist"
  s["CODE_SIGN_ENTITLEMENTS"] = "#{name}/MZGTABroadcast.entitlements"
  s["SWIFT_VERSION"] = "5.0"
  s["IPHONEOS_DEPLOYMENT_TARGET"] = "15.0"
  s["TARGETED_DEVICE_FAMILY"] = "1,2"
  s["MARKETING_VERSION"] ||= "1.0"
  s["CURRENT_PROJECT_VERSION"] ||= "1"
  s["SKIP_INSTALL"] = "YES"
  s["APPLICATION_EXTENSION_API_ONLY"] = "YES"
  s["LD_RUNPATH_SEARCH_PATHS"] = ["$(inherited)", "@executable_path/Frameworks", "@executable_path/../../Frameworks"]
end
proj.save
puts "MZGTABroadcast extension target ready"
