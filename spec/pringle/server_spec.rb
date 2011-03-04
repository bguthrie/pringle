require 'spec_helper'

describe Pringle::Server do
  include Rack::Test::Methods

  let :app do
    Pringle::Server.new
  end

  context "GET /pringle/:project_name" do
    it "should get the index file, and do nothing else" do
      get "/pringle/agile_hybrid"
      last_response.should be_ok
      last_response.should match("Pringle - Projected Mingle")
    end
  end

  context "GET /mingle/*" do
    attr_reader :mingle

    before :each do
      @mingle = double("Mingle")
      Pringle.client = @mingle
    end

    def json_response
      ActiveSupport::JSON.decode(last_response.body)
    end

    it "should proxy requests to the Mingle client" do
      mingle.should_receive("query").with("/projects/agile_hybrid", {})
      get "/mingle/projects/agile_hybrid"
    end

    it "should include any query parameters in the proxied requests" do
      mingle.should_receive("query").with("/projects/agile_hybrid", { "foo" => "bar" })
      get "/mingle/projects/agile_hybrid?foo=bar"
    end

    context "responds with success" do
      it "should return a 200 status if the client responds with 200" do
        mingle.stub!("query").and_return(stub("response", :code => "200", :deserialise => {}))
        get "/mingle/projects/agile_hybrid?foo=bar"
        last_response.status.should == 200
      end

      it "should return the JSON-encoded, deserialised body of the response in its body" do
        mingle.stub!("query").and_return(stub("response", :code => "200", :deserialise => { :foo => "bar" }))
        get "/mingle/projects/agile_hybrid?foo=bar"
        ActiveSupport::JSON.decode(last_response.body).should == { "foo" => "bar" }
      end
    end

    context "responds with an error" do
      it "should return a 404 status if the client responds with 404" do
        mingle.stub!("query").and_return(stub("response", :code => "404", :body => nil))
        get "/mingle/projects/some_bad_uri"
        last_response.status.should == 404
      end

      it "should include the requested URI in the JSON-encoded response" do
        mingle.stub!("query").and_return(stub("response", :code => "404", :body => nil))
        get "/mingle/projects/some_bad_uri"
        json_response["uri"].should == "/projects/some_bad_uri"
      end

      it "should include the body of the response in the request" do
        mingle.stub!("query").and_return(stub("response", :code => "404", :body => "woah dude, bad uri"))
        get "/mingle/projects/some_bad_uri"
        json_response["text"].should == "woah dude, bad uri"
      end
    end
  end
end