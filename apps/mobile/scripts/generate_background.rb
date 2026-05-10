#!/usr/bin/env ruby
# Generate Frameit background with brand gradient

require 'rmagick'

# Configuration
BACKGROUND_PATH = File.expand_path('../fastlane/screenshots/background.png', __dir__)
BRAND_COLOR = '#177246'
SECONDARY_COLOR = '#1f8f59'
WIDTH = 1290  # iPhone 15 Pro Max width
HEIGHT = 2796 # iPhone 15 Pro Max height

# Create gradient background
canvas = Magick::ImageList.new
canvas.new_image(WIDTH, HEIGHT) do
  self.background_color = BRAND_COLOR
end

# Create a subtle gradient effect
gradient = Magick::GradientFill.new(0, 0, 0, HEIGHT, BRAND_COLOR, SECONDARY_COLOR)
gradient_image = Magick::Image.new(WIDTH, HEIGHT, gradient)

# Composite gradient with subtle opacity
gradient_image.opacity = Magick::MaxRGB * 0.15
canvas = canvas.composite(gradient_image, Magick::CenterGravity, Magick::OverCompositeOp)

# Add subtle UnionHub watermark
text = Magick::Draw.new
text.pointsize = 120
text.font = 'Helvetica'
text.font_weight = Magick::BoldWeight
text.fill = 'white'
text.opacity = 0.03
text.gravity = Magick::CenterGravity
text.annotate(canvas, 0, 0, 0, 0, 'UnionHub')

# Add subtle noise texture for depth
noise = Magick::Image.new(WIDTH, HEIGHT) do
  self.background_color = 'white'
end
noise = noise.add_noise(Magick::UniformNoise)
noise.opacity = Magick::MaxRGB * 0.02
canvas = canvas.composite(noise, Magick::CenterGravity, Magick::OverCompositeOp)

canvas.write(BACKGROUND_PATH)
puts "Background generated: #{BACKGROUND_PATH}"
