module Pringle
  class Server < Sinatra::Base
    set :app_file, File.dirname(__FILE__) + "/../pringle"
    set :haml, :format => :html5

    get '/pringle/:project_name' do
      haml :index
    end

    get '/mingle/*' do
      content_type "application/json"
      response = Pringle.client.query("/" + params[:splat].join, params.except("splat"))

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
  end
end