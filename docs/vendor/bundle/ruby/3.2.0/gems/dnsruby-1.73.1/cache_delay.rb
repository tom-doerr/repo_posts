require "dnsruby"
Dnsruby::TheLog.level = Logger::DEBUG

def testme
  domain1 = "example.com"
  domain2 = "example.net"
  
  start_time = Time.now
  resolver = Dnsruby::Resolver.new
  resolver.query(domain1)
  puts "First query time: #{Time.now - start_time} seconds"
  
  start_time = Time.now
  resolver = Dnsruby::Resolver.new
  resolver.query(domain2)
  puts "Second query time: #{Time.now - start_time} seconds"
end

testme
testme
