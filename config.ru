$:.unshift File.dirname(__FILE__) + "/lib/"
require 'pringle'
use Rack::Static, :urls => ["/"], :root => "public"
run Pringle
