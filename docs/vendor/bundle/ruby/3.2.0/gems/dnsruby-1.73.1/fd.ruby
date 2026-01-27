#!/usr/bin/env ruby

# frozen_string_literal: true

require 'dnsruby'
require 'thread'

#Dnsruby.log.level = Logger::DEBUG

# speed up the repro
NFILES = 30
nfiles, _ = Process.getrlimit(Process::RLIMIT_NOFILE)
Process.setrlimit(Process::RLIMIT_NOFILE, NFILES) if nfiles > NFILES

NAMESERVERS = ["192.31.80.30"]

Thread.new {
  res = Dnsruby::Resolver.new(nameserver: NAMESERVERS, do_caching: false, query_timeout: 5)
  loop do
    begin
      res.query("blahblahblah.com.edgekey.net", "CNAME")
    rescue Dnsruby::ResolvError
    end
    sleep 0.2
  end
}

loop do
#  system("ls -l /proc/#{Process.pid}/fd/")
  system("lsof -p #{Process.pid} | wc -l")
  File.open("/") { |_| }
  sleep 1
end
