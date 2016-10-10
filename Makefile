
GULP = node_modules/.bin/gulp
ESLINT = node_modules/.bin/eslint
SASSLINT = node_modules/.bin/sass-lint

.PHONY: all clean deploy deploy-test dist dist-dev distclean watch lint pkg-osx pkg-win pkg-linux app-run

all: dist

deploy: dist
	echo `date +"%Y-%m-%d_%H:%M:%S"` > dist/.timestamp
	rm -f dist/js/*.map
	rm -f dist/assets/styles/*.map
	rsync -av --delete dist/ agp@node10.dns-hosting.info:/var/www/webrtc/
	ssh agp@node10.dns-hosting.info 'sudo /root/sync-webrtc.sh'

deploy-test: dist-dev
	echo `date +"%Y-%m-%d_%H:%M:%S"` > dist/.timestamp
	rsync -av --exclude .htaccess --delete dist/ agp@node10.dns-hosting.info:/var/www/webrtc-test/

dist:
	$(GULP) build --type production

dist-dev:
	$(GULP) build --type dev

clean:
	rm -rf dist dist-electron app/www

distclean: clean
	rm -rf node_modules app/node_modules

watch:
	$(GULP) watch --type dev

lint:
	$(SASSLINT) -v -q
	$(ESLINT) src/app

electron: dist
	rm -rf app/www
	cp -r dist app/www

pkg-osx: electron
	npm run build-osx

pkg-win: electron
	npm run build-win

pkg-linux: electron
	npm run build-linux

app-run: electron
	npm start
