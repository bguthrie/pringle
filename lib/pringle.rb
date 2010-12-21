require 'sinatra/base'
require 'less'
require 'wrest'
require 'haml'
require 'active_support/json/encoding'
require 'active_support/core_ext/hash/except'

%w(MINGLE_USERNAME MINGLE_PASSWORD MINGLE_HOST).each do |configuration_setting|
  unless ENV.has_key?(configuration_setting)
    raise "Configuration setting #{configuration_setting} not available. Exiting."
  end

  Object.class_eval { const_set configuration_setting, ENV[configuration_setting] }
end

class Mingle
  MINGLE_API_BASE   = "api/v2"
  CONTENT_TYPE = "xml"

  def initialize(opts={})
    @content_type = opts[:content_type] || CONTENT_TYPE

    host, username, password = opts.values_at(:host, :username, :password)
    @base_uri = "#{host}/#{MINGLE_API_BASE}".to_uri(:username => username, :password => password)
  end

  def query(path, params={})
    puts("Path is #{path}; params are #{params.inspect}")
    to_uri(path).get(params)
  end

  private

    def to_uri(path)
      @base_uri["#{path}.#{@content_type}"]
    end
end

MINGLE = Mingle.new(:host => MINGLE_HOST, :username => MINGLE_USERNAME, :password => MINGLE_PASSWORD)

class Pringle < Sinatra::Base
  set :app_file, __FILE__
  set :haml, :format => :html5

  get '/pringle/configure' do
    haml :configure
  end

  get '/pringle/:project_name' do
    haml :index
  end

  get '/mingle/*' do
    content_type "application/json"
    response = MINGLE.query("/" + params[:splat].join, params.except("splat"))

    case response.code.to_i
    when 404
      status 404
      body ActiveSupport::JSON.encode(:error => "Not Found", :uri => params[:path])
    when 200
      json = ActiveSupport::JSON.encode(response.deserialise)
      if params[:callback]
        body "#{params[:callback]}(#{json});"
      else
        body json
      end
    else
      status response.code.to_i
      body ActiveSupport::JSON.encode(:error => "Unknown", :uri => params[:path], :text => response.body)
    end
  end
  
  get '/application.css' do
    content_type "text/css"
    body         Less.parse File.read("public/application.less")
  end
end
