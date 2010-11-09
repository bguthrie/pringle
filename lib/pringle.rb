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

class Pringle < Sinatra::Base
  MINGLE_API_BASE = "/api/v2"

  set :app_file, __FILE__
  set :haml, :format => :html5

  get '/pringle/configure' do
    haml :configure
  end

  get '/pringle' do
    haml :index
  end
  
  def base_mingle_uri(path)
    (MINGLE_HOST + MINGLE_API_BASE + path + ".xml").to_uri(:username => MINGLE_USERNAME, :password => MINGLE_PASSWORD)
  end
  
  get '/mingle' do
    content_type "application/json"
    mingle_uri = base_mingle_uri(params[:path])
    response = mingle_uri.get(params[:params])

    case response.code.to_i
    when 404
      status 404
      body ActiveSupport::JSON.encode(:error => "Not Found", :uri => mingle_uri.inspect)
    when 200
      json = ActiveSupport::JSON.encode(response.deserialise)
      if params[:callback]
        body "#{params[:callback]}(#{json});"
      else
        body json
      end
    else
      status response.code.to_i
      body ActiveSupport::JSON.encode(:error => "Unknown", :text => response.body)
    end
  end

  get '/application.css' do
    content_type "text/css"
    body         Less.parse File.read("public/application.less")
  end
end
