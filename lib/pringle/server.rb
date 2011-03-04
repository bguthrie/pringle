module Pringle
  class Server < Sinatra::Base
    set :app_file, File.dirname(__FILE__) + "/../pringle"
    set :haml, :format => :html5

    get '/pringle/:project_name' do
      haml :index
    end

    get '/mingle/*' do
      content_type "application/json"

      path = "/" + params["splat"].join
      query = params.except("splat")
      response = Pringle.client.query(path, query)

      case response.code.to_i
      when 200
        json = ActiveSupport::JSON.encode(response.deserialise)
        if params[:callback]
          body "#{params[:callback]}(#{json});"
        else
          body json
        end
      when 400..599
        status response.code.to_i
        body ActiveSupport::JSON.encode(:error => "Error", :uri => path, :text => response.body)
      end
    end
  end
end