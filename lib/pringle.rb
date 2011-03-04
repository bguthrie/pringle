require 'sinatra/base'
require 'wrest'
require 'haml'
require 'readline'
require 'active_support/json/encoding'
require 'active_support/core_ext/hash/except'

require 'pringle/mingle_client'
require 'pringle/project'
require 'pringle/server'
require 'pringle/console'

module Pringle
  class << self
    attr_accessor :client
  end

  def self.boot!
    %w(MINGLE_USERNAME MINGLE_PASSWORD MINGLE_HOST).each do |configuration_setting|
      unless ENV.has_key?(configuration_setting)
        raise "Configuration setting #{configuration_setting} not available. Exiting."
      end
    end

    # I wouldn't normally set a global, but I don't know how to inject depencies into 
    # Sinatra classes like Pringle::Server properly.
    Pringle.client = Pringle::MingleClient.new(
      :host => ENV["MINGLE_HOST"], 
      :username => ENV["MINGLE_USERNAME"], 
      :password => ENV["MINGLE_PASSWORD"]
    )
  end

end

Pringle.boot!