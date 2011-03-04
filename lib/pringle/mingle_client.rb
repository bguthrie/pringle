module Pringle
  class MingleClient
    MINGLE_API_BASE   = "api/v2"
    CONTENT_TYPE = "xml"

    class BlackHoleCache < Hash # None for me, thanks.
      def has_key?(key); false; end
      def [](key); nil; end
    end

    attr_reader :host, :username, :password

    def initialize(opts={})
      @content_type = opts[:content_type] || CONTENT_TYPE

      @host, @username, @password = opts.values_at(:host, :username, :password)
      @base_uri = "#{host}/#{MINGLE_API_BASE}".to_uri(:username => username, :password => password, :cache_store => BlackHoleCache.new)
    end

    def query(path, params={})
      to_uri(path).get(params)
    end

    def project(name)
      Pringle::Project.new(self, name)
    end

    private

    def to_uri(path)
      @base_uri["#{path}.#{@content_type}"]
    end
  end
end