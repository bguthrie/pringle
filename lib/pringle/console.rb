module Pringle
  class Console
    include Readline

    attr_reader :project, :client, :prompt

    DEFAULT_PROMPT = "mql> "

    def initialize(opts = {})
      @client = opts[:client] || Pringle.client
      @prompt = opts[:prompt] || DEFAULT_PROMPT
      self.project = opts[:project]
    end

    def start
      loop do
        line = get_line
        next if line.blank?

        case line
        when /help/i
          print_help
        when /exit/i
          puts "Exiting."
          break
        when /use ['"](\w+)['"]/
          puts "Using #{$1}"
          self.project = $1
        else # Assume a query.
          if self.project.blank?
            puts "Must specify a project using 'use'"
          else
            execute_query line
          end
        end
      end
    end

    private

    def project=(project_name)
      @project = client.project(project_name) unless project_name.blank?
    end

    def get_line
      readline self.prompt, true
    end

    def execute_query(line)
      response = self.project.mql(line)
      mql = response.deserialise
      
      case response.code.to_i
      when 422
        puts "Error: " + mql["errors"]["error"]
      when 200
        results = mql["results"]
        
        print_result_set(results) unless results.empty?
        
        puts "#{results.length} result(s) returned."
      end
    end

    def print_result_set(results)
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

    HELP_FORMAT = "    %-20s %s"

    def print_help
      puts
      puts "Commands: "
      puts
      puts HELP_FORMAT % [ "help", "See this message" ]
      puts HELP_FORMAT % [ "use '<project>'", "Switch to the named project on Mingle" ]
      puts HELP_FORMAT % [ "<query>", "Execute the given query against the current project"]
      puts
      puts "Environment: "
      puts
      puts HELP_FORMAT % [ "MINGLE_USERNAME", self.client.username ]
      puts HELP_FORMAT % [ "MINGLE_PASSWORD", self.client.password ]
      puts HELP_FORMAT % [ "MINGLE_HOST",     self.client.host ]
      puts HELP_FORMAT % [ "MINGLE_PROJECT",  self.project ? self.project.name : "(none)" ]
      puts
    end
  end
end