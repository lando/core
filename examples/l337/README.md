# L337 Example

This example exists primarily to test the v3 runtime implementation of following documentation:

* [Lando 3 l337 service](https://docs.lando.dev/core/v3/services/l337.html)

## Start up tests

```bash
# should start successfully
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_rsa
lando poweroff
lando start
```

## Verification commands

Run the following commands to verify things work as expected

```bash
# should destroy successfully
lando destroy -y

# should have correct info when not built
lando info --service db | grep api: | grep 4
lando info --service db | grep type: | grep l337
lando info --service db | grep healthy: | grep unknown
lando info --service db | grep state: | grep IMAGE: | grep UNBUILT
lando info --service db | grep -z image: | grep core/examples/l337/Dockerfile
lando info --service db | grep primary: | grep false
lando info --service db | grep user: | grep root
cat $(lando info --service db --path "image" --format json | tr -d '"') | grep "ENV SERVICE=db"
lando info --service web | grep api: | grep 4
lando info --service web | grep type: | grep l337
lando info --service web | grep state: | grep IMAGE: | grep UNBUILT
lando info --service web | grep -z image: | grep /Imagefile
lando info --service web | grep primary: | grep true
lando info --service web | grep appMount: | grep /site
lando info --service web | grep user: | grep nginx
cat $(lando info --service web --path "image" --format json | tr -d '"') | grep ENV | grep SERVICE | grep web
lando info --service image-1 | grep image: | grep nginx:1.21.6
lando info --service image-2 | grep -z image: | grep core/examples/l337/images/nginx/Dockerfile
lando info --service image-3 | grep -z image: | grep /Imagefile
lando info --service image-4 | grep image: | grep nginx:1.21.5
lando info --service image-5 | grep -z image: | grep core/examples/l337/images/nginx/Dockerfile2
lando info --service image-6 | grep -z image: | grep /Imagefile

# should start again successfully
lando start

# should stop and start successfully
lando stop
lando start

# should restart successfully
lando restart

# should rebuild successfully
lando rebuild -y

# should have the correct info when built
lando info --service db | grep state: | grep IMAGE: | grep BUILT
lando info --service web |  grep state: | grep IMAGE: | grep BUILT
lando info --service image-1 | grep state: | grep IMAGE: | grep BUILT
lando info --service image-2 | grep state: | grep IMAGE: | grep BUILT
lando info --service image-3 | grep state: | grep IMAGE: | grep BUILT
lando info --service image-4 | grep state: | grep IMAGE: | grep BUILT
lando info --service image-5 | grep state: | grep IMAGE: | grep BUILT
lando info --service image-6 | grep state: | grep IMAGE: | grep BUILT
lando info --service db | grep tag: | grep "lando/l337\-" | grep "\-db:latest"
lando info --service web | grep tag: | grep "lando/l337\-" | grep "\-web:latest"
lando info --service image-1 | grep tag: | grep "lando/l337\-" | grep "\-image-1:latest"
lando info --service image-2 | grep tag: | grep "lando/l337\-" | grep "\-image-2:latest"
lando info --service image-3 | grep tag: | grep "lando/l337\-" | grep "\-image-3:latest"
lando info --service image-4 | grep tag: | grep "lando/nginx:powerman-5000"
lando info --service image-5 | grep tag: | grep "lando/l337\-" | grep "\-image-5:latest"
lando info --service image-6 | grep tag: | grep "lando/l337\-" | grep "\-image-6:latest"

# should use web as the primary service for tooling and events
lando ssh --command "env" | grep SERVICE | grep web
lando env | grep SERVICE | grep web

# should use the user as the default exec user
lando whoami | grep nginx

# should set http/https metadata as needed
docker inspect l337_web_1 | grep dev.lando.http-ports | grep "8888"
docker inspect l337_web_1 | grep dev.lando.https-ports | grep '"",'

# should automatically set appMount if appRoot is volume mounted
lando pwd | grep /site

# should allow top level volume creation
docker volume ls | grep l337_my-data

# should allow top level network creation
docker network ls | grep l337_my-network

# should correctly pass in build args to build and buildx
lando env --service build-args-1 | grep NGINX_VERSION | grep "1.19.2"
lando env --service build-args-1 | grep VIBE | grep rising
lando env --service build-args-2 | grep NGINX_VERSION | grep "1.21.5"
lando env --service build-args-2 | grep VIBE | grep dialed

# should handle different image build formats
lando env | grep SERVICE | grep web
lando env --service db | grep SERVICE | grep db
lando env --service image-1 | grep NGINX_VERSION | grep "1.21.6"
lando env --service image-2 | grep SERVICE | grep image-2
lando env --service image-3 | grep SERVICE | grep image-3
lando env --service image-4 | grep NGINX_VERSION | grep "1.21.5"
lando env --service image-5 | grep SERVICE | grep image-5
lando env --service image-6 | grep SERVICE | grep image-6

# should handle COPY instructions correctly
lando ssh --service web --command "curl localhost:8888" | grep "look you wanna be L337"
lando ssh --service db --command "stat /thing"
lando ssh --service db --command "stat /itworked"
lando ssh --service image-2 --command "stat /file10"
lando ssh --service image-3 --command "stat /file1"

# should run in working_dir if appMount is not set
lando pwd --service db | grep /tmp
lando ssh --service db --command "pwd" | grep /tmp
cd folder
lando pwd --service db | grep -w /tmp
lando ssh --service db --command "pwd" | grep /tmp
cd ..

# should run in image working_dir as fallback
lando pwd --service image-1 | grep -w /
lando ssh --service image-1 --command "pwd" | grep -w /
lando pwd --service image-6 | grep /usr/share/nginx/html
lando ssh --service image-6 --command "pwd" | grep /usr/share/nginx/html

# should correctly mount read-only volumes
lando ssh --command "test -r /file-ro"
lando ssh --command "test -w /file-ro" || echo $? | grep 1

# should handle all context options correctly
lando stat /folder
lando stat /folder/stuff
lando stat /folder/more-stuff
lando stat /thing
lando stat /thing/stuff
lando stat /thing/more-stuff
lando stat /file2
lando stat /file3
lando stat /tmp/file4
lando stat /file4 || echo $? | grep 1
lando stat /tmp/stuff/file5
lando stat /file6
lando stat /images/nginx/Dockerfile
lando stat /file7
lando stat -c "%U:%G" /file7 | grep nginx:nginx
lando stat /file8
lando stat -c "%U:%G" /file8 | grep nginx:dialout
lando stat /file9
lando stat -c "%U:%G" /file9 | grep nginx:nginx
lando stat /SeaShanties/lyrics/main/shanties/HeresAHealthToTheCompany.json
lando stat /etc/config/available-shanties.json
lando stat -c "%U:%G" /etc/config/available-shanties.json | grep eddie-teach:eddie-teach
lando env --service context-1 | grep HALL | grep OATES

# should order build steps correctly
lando groups | sed -n '1p' | grep root-default--99999999-root-root
lando groups | sed -n '2p' | grep root-system-4--100000-root-root
lando groups | sed -n '3p' | grep nginx-system--10010-nginx-nginx
lando groups | sed -n '4p' | grep root-system--10000-root-root
lando groups | sed -n '5p' | grep root-system--9998-root-root
lando groups | sed -n '6p' | grep root-system--9997-root-root
lando groups | sed -n '7p' | grep nginx-system--9996-nginx-nginx
lando groups | sed -n '8p' | grep nginx-system--9995-nginx-nginx
lando groups | sed -n '9p' | grep root-context-0-root-root
lando groups | sed -n '10p' | grep nginx-user-10-nginx-nginx
lando groups | sed -n '11p' | grep root-default-1000-root-root
lando groups | sed -n '12p' | grep root-default-1000-root-root
lando groups | sed -n '13p' | grep nginx-user-10000-nginx-nginx
lando groups | sed -n '14p' | grep nginx-val-jean-24591-nginx-nginx
lando groups | sed -n '15p' | grep root-val-jean-24601-root-root
lando groups | sed -n '16p' | grep root-val-jean-24603-root-root
lando groups | sed -n '17p' | grep root-val-jean-24604-root-root
lando groups | sed -n '18p' | grep nginx-val-jean-24605-nginx-nginx
lando groups | sed -n '19p' | grep nginx-val-jean-24606-nginx-nginx
lando groups | sed -n '20p' | grep root-val-jean-24701-root-root

# should run build steps as the correct user
lando groups | sed -n '1p' | grep root-default--99999999-root-root
lando groups | sed -n '2p' | grep root-system-4--100000-root-root
lando groups | sed -n '3p' | grep nginx-system--10010-nginx-nginx
lando groups | sed -n '4p' | grep root-system--10000-root-root
lando groups | sed -n '5p' | grep root-system--9998-root-root
lando groups | sed -n '6p' | grep root-system--9997-root-root
lando groups | sed -n '7p' | grep nginx-system--9996-nginx-nginx
lando groups | sed -n '8p' | grep nginx-system--9995-nginx-nginx
lando groups | sed -n '9p' | grep root-context-0-root-root
lando groups | sed -n '10p' | grep nginx-user-10-nginx-nginx
lando groups | sed -n '11p' | grep root-default-1000-root-root
lando groups | sed -n '12p' | grep root-default-1000-root-root
lando groups | sed -n '13p' | grep nginx-user-10000-nginx-nginx
lando groups | sed -n '14p' | grep nginx-val-jean-24591-nginx-nginx
lando groups | sed -n '15p' | grep root-val-jean-24601-root-root
lando groups | sed -n '16p' | grep root-val-jean-24603-root-root
lando groups | sed -n '17p' | grep root-val-jean-24604-root-root
lando groups | sed -n '18p' | grep nginx-val-jean-24605-nginx-nginx
lando groups | sed -n '19p' | grep nginx-val-jean-24606-nginx-nginx
lando groups | sed -n '20p' | grep root-val-jean-24701-root-root

# Should run steps in all allowed formats
lando env --service steps-1 | grep VIBES | grep RISING
lando env --service steps-1 | grep KIRK | grep wesley
lando env --service steps-1 | grep SPOCK | grep peck

# Should run unknown groups as the default group
lando ssh --service steps-1 --command "cat /tmp/val-jean-group" | grep default-1000-root

# Should order detached groups by weight
lando ssh --service steps-1 --command "cat /stuff" | sed -n '1p' | grep first
lando ssh --service steps-1 --command "cat /stuff" | sed -n '2p' | grep middle
lando ssh --service steps-1 --command "cat /stuff" | sed -n '3p' | grep last
```

## Destroy tests

```bash
# should destroy successfully
killall ssh-agent && unset SSH_AUTH_SOCK
lando destroy -y
lando poweroff
```
