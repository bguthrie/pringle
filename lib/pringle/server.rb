module Pringle
  class Server < Sinatra::Base
    set :app_file, File.dirname(__FILE__) + "/../pringle"
    set :haml, :format => :html5

    get '/pringle/:project_name' do
      haml :index
    end
  end
end