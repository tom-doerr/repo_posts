SHELL := /bin/sh

build:
	jekyll build -s docs -d docs/_site

serve:
	jekyll serve -s docs -d docs/_site --livereload --port 4000

test:
	pytest -q

