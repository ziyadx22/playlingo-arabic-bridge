# Adds the MZGTA ReplayKit Broadcast Upload Extension target and embeds it in App. Idempotent.
require "xcodeproj"
proj = Xcodeproj::Project.open(ARGV[0] || "ios/App/App.xcodeproj")
app = proj.targets.find { |t| t.name == "App" } or abort "App target not found"
name = "MZGTABroadcast"
product_file = "#{name}.appex"
ext = proj.targets.find { |t| t.name == name }
unless ext
  # Pass the products group and product basename explicitly; without a basename
  # xcodeproj creates a product reference with an empty ".appex" file name.
  ext = proj.new_target(:app_extension, name, :ios, "15.0", proj.products_group, :swift, name)
  group = proj.main_group.find_subpath(name, true)
  group.set_source_tree("SOURCE_ROOT"); group.set_path(name)
  ext.add_file_references([group.new_file("SampleHandler.swift")])
  group.new_file("Info.plist"); group.new_file("MZGTABroadcast.entitlements")
  %w[ReplayKit Vision].each { |fw| ext.add_system_framework(fw) }
end

# Always repair the product reference so the extension builds as MZGTABroadcast.appex.
product = ext.product_reference
unless product
  product = proj.products_group.new_reference(product_file, :built_products)
  ext.product_reference = product
end
product.name = product_file
product.path = product_file
product.source_tree = "BUILT_PRODUCTS_DIR"
product.explicit_file_type = "wrapper.app-extension"
product.include_in_index = "0"
product.last_known_file_type = nil if product.respond_to?(:last_known_file_type=)
proj.products_group.children << product unless proj.products_group.children.include?(product)
ext.product_type = "com.apple.product-type.app-extension"

app.add_dependency(ext) unless app.dependencies.any? { |d| d.target == ext }
embed = app.copy_files_build_phases.find { |p| p.name == "Embed App Extensions" } || app.new_copy_files_build_phase("Embed App Extensions")
embed.dst_subfolder_spec = "13"
embed.dst_path = ""
unless embed.files_references.include?(product)
  build = embed.add_file_reference(product, true)
  build.settings = { "ATTRIBUTES" => ["RemoveHeadersOnCopy"] }
end

ext.build_configurations.each do |c|
  s = c.build_settings
  s["PRODUCT_NAME"] = name
  s["PRODUCT_MODULE_NAME"] = name
  s["WRAPPER_EXTENSION"] = "appex"
  # Keep the bundle ID already registered for TestFlight signing and the App Group.
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

bad = ext.build_configurations.reject { |c| c.build_settings["PRODUCT_NAME"] == name && c.build_settings["WRAPPER_EXTENSION"] == "appex" }
abort "MZGTABroadcast build settings incomplete" unless bad.empty?
abort "MZGTABroadcast product reference is #{ext.product_reference&.path.inspect}" unless ext.product_reference&.path == product_file
puts "MZGTABroadcast extension target ready (#{product_file})"
