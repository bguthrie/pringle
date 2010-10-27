require 'sinatra/base'
require 'less'
require 'wrest'
require 'haml'
require 'active_support/json/encoding'

class Pringle < Sinatra::Base
  MINGLE_USERNAME = "bguthrie"
  MINGLE_PASSWORD = "password"
  MINGLE_HOST     = "localhost:8080"
  MINGLE_API_BASE = "/api/v2"

  set :app_file, __FILE__
  set :haml, :format => :html5

  get '/pringle/configure' do
    haml :configure
  end

  get '/pringle' do
    haml :index
  end

  get '/mingle' do
    content_type "application/json"
    mingle_uri = "http://#{MINGLE_USERNAME}:#{MINGLE_PASSWORD}@#{MINGLE_HOST}#{MINGLE_API_BASE}#{params[:path]}.xml?#{params[:params]}"
    response = mingle_uri.to_uri.get

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
      body ActiveSupport::JSON.encode(:error => "Unknown", :text => response.body)
    end
  end

  get '/application.css' do
    content_type "text/css"
    body         Less.parse File.read("public/application.less")
  end
end
