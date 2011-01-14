# require 'spec/rake/spectask'
# 
# Spec::Rake::SpecTask.new("spec") do |t|
#   t.pattern = "spec/**/*_spec.rb"
# end

require "rspec/core/rake_task"

desc "Run all Specs"
  RSpec::Core::RakeTask.new(:spec) do |t|
end

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
  require 'lib/pringle'
  require 'readline'
  include Readline
  
  project_name = ENV['MINGLE_PROJECT']  
  project = Project.new(project_name) unless project_name.blank?
  
  loop do
    line = readline "mql> ", true
    next if line.blank?
    
    case line
    when /help/i
      format = "    %-20s %s"
      
      puts
      puts "Commands: "
      puts
      puts format % [ "help", "See this message" ]
      puts format % [ "use '<project>'", "Switch to the named project on Mingle" ]
      puts format % [ "<query>", "Execute the given query against the current project"]
      puts
      puts "Environment: "
      puts
      puts format % [ "MINGLE_USERNAME", Project.adapter.username ]
      puts format % [ "MINGLE_PASSWORD", Project.adapter.password ]
      puts format % [ "MINGLE_HOST",     Project.adapter.host ]
      puts format % [ "MINGLE_PROJECT",  project ? project.name : "(none)" ]
      puts
    when /exit/i
      break
    when /use ['"](\w+)['"]/
      puts "Using #{$1}"
      project = Project.new($1)
    else
      if project.blank?
        puts "Must specify a project using 'use'"
      else
        response = project.mql(line)
        mql = response.deserialise
        
        case response.code.to_i
        when 422
          puts "Error: " + mql["errors"]["error"]
        when 200
          results = mql["results"]
          
          unless results.empty?
            columns = results.first.keys
            max_width = columns.map(&:length).max + 4
            row_format = ("| %-#{max_width}s" * columns.length) + "|"
            column_row = row_format % columns
            
            divider = "-" * column_row.length
            
            puts divider
            puts column_row
            puts divider
            
            results.each do |row|
              value_row = row_format % columns.map { |c| row[c] || "<null>" }
              puts value_row
            end
            
            puts divider
          end
          
          puts "#{results.length} result(s) returned."
        end
      end
    end
  end
end

task :default => :spec

