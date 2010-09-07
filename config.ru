$:.unshift File.dirname(__FILE__) + "/lib/"
require 'leangle'
use Rack::Static, :urls => ["/images", "/javascript"], :root => "public"
run Sinatra::Application
