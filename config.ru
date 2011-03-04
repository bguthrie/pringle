$:.unshift File.dirname(__FILE__) + "/lib/"
require 'pringle'
Pringle.boot!

use Rack::Static, :urls => %w(/images /javascript /stylesheets /templates), :root => "public"
run Pringle::Server
