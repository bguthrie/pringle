module Pringle
  class Project
    attr_reader :name, :client

    def initialize(client, name)
      @client = client
      @name = name
    end

    def query(path, params={})
      client.query("/projects/#{@name}#{path}", params)
    end

    def mql(query)
      query("/cards/execute_mql", :mql => query)
    end
  end
end