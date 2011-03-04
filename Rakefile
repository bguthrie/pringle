# require 'spec/rake/spectask'
# 
# Spec::Rake::SpecTask.new("spec") do |t|
#   t.pattern = "spec/**/*_spec.rb"
# end

# require "rspec/core/rake_task"

# desc "Run all Specs"
#   RSpec::Core::RakeTask.new(:spec) do |t|
# end

desc "Run a REPL with the right libs required."
task :repl do
  system "irb -Ilib -r rubygems -r lib/pringle"
end

desc "Run a Rackup server in development mode"
task :server do
  system "rackup -E development -p 4567 config.ru"
end

desc "Deploy to Heroku"
task :deploy do
  system "git push heroku master"
end

desc "Start a MQL console for the given MINGLE_PROJECT"
task :mqlconsole do |_, args|
  $: << "lib"
  require 'pringle'
  Pringle::Console.new(:project => ENV['MINGLE_PROJECT']).start
end

task :default => :spec
