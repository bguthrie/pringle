require 'sinatra/base'
require 'less'
require 'wrest'
require 'haml'
require 'active_support/json/encoding'

%w(MINGLE_USERNAME MINGLE_PASSWORD MINGLE_HOST).each do |configuration_setting|
  unless ENV.has_key?(configuration_setting)
    raise "Configuration setting #{configuration_setting} not available. Exiting."
  end
  
  Object.class_eval { const_set configuration_setting, ENV[configuration_setting] }
end

class Mingle
  MINGLE_API_BASE   = "/api/v2"
  CONTENT_EXTENSION = ".xml"
  
  attr_reader :host, :username, :password
  
  def initialize(opts={})
    @host, @username, @password = opts.values_at(:host, :username, :password)
  end
  
  def query(path, params={})
    to_uri(path).get(params)
  end
  
  private
  
    def to_uri(path)
      (self.host + MINGLE_API_BASE + path + CONTENT_EXTENSION).to_uri(:username => self.username, :password => self.password)
    end
end

class Pringle < Sinatra::Base
  set :app_file, __FILE__
  set :haml, :format => :html5
  MINGLE = Mingle.new(:host => MINGLE_HOST, :username => MINGLE_USERNAME, :password => MINGLE_PASSWORD)

  get '/pringle/configure' do
    haml :configure
  end

  get '/pringle' do
    haml :index
  end

  get '/mingle' do
    content_type "application/json"
    query_params = params[:params].blank? ? {} : Rack::Utils.parse_query(params[:params])
    
    response = MINGLE.query(params[:path], query_params)

    case response.code.to_i
    when 404
      status 404
      body ActiveSupport::JSON.encode(:error => "Not Found", :uri => mingle_uri)
    when 200
      json = ActiveSupport::JSON.encode(response.deserialise)
      if params[:callback]
        body "#{params[:callback]}(#{json});"
      else
        body json
      end
    else
      status response.code.to_i
      body ActiveSupport::JSON.encode(:error => "Unknown", :uri => mingle_uri, :text => response.body)
    end
  end

  get '/application.css' do
    content_type "text/css"
    body         Less.parse File.read("public/application.less")
  end
end
