#!/usr/bin/env ruby
# Organize Detox screenshots into Fastlane structure

require 'fileutils'
require 'pathname'

# Configuration
DETOX_ARTIFACTS = File.expand_path('../e2e/artifacts', __dir__)
FASTLANE_SCREENSHOTS = File.expand_path('../fastlane/screenshots', __dir__)
LANGUAGES = ['en-US', 'it-IT']

# Create output directories
LANGUAGES.each do |lang|
  dir = File.join(FASTLANE_SCREENSHOTS, lang)
  FileUtils.mkdir_p(dir) unless Dir.exist?(dir)
end

# Find and organize screenshots
Dir.glob(File.join(DETOX_ARTIFACTS, '**/*.png')).each do |screenshot|
  filename = File.basename(screenshot)

  # Extract language from filename pattern
  # Detox format: en-US.01.login.png or it-IT.02.home.png
  lang = LANGUAGES.find { |l| filename.include?(l.gsub('-', '_')) || filename.include?(l) }

  next unless lang

  # Clean filename - remove timestamp and ID prefixes, keep meaningful name
  # Expected format: en-US.01.login.png -> iPhone_67_01_login.png
  clean_name = filename
    .gsub(/^#{lang.gsub('-', '_')}\./, '')          # Remove language prefix
    .gsub(/^#{lang}\./, '')                          # Remove language prefix (alt format)
    .gsub(/^\d+_/, '')                               # Remove leading number
    .gsub(/\.[0-9a-f]{8,}/, '')                      # Remove Detox timestamp/hash
    .gsub('.', '-')                                  # Replace dots with dashes for Frameit
    .gsub('.png', '')                                # Remove extension

  # Add iPhone 15 Pro Max (6.7") prefix and .png extension
  final_name = "iPhone_67_#{clean_name}.png"

  dest = File.join(FASTLANE_SCREENSHOTS, lang, final_name)

  FileUtils.cp(screenshot, dest)
  puts "Copied: #{filename} -> #{lang}/#{final_name}"
end

puts "\nScreenshot organization complete!"
puts "Screenshots organized in: #{FASTLANE_SCREENSHOTS}"
