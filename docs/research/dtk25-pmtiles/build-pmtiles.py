import os, sqlite3, sys, subprocess, time
W, OUT, PM = sys.argv[1:4]
for fmt, ext in (("jpg","jpg"),("png","png"),("webp","webp")):
    mb = os.path.join(OUT, f"dtk25-sample-{fmt}.mbtiles")
    if os.path.exists(mb): os.remove(mb)
    db = sqlite3.connect(mb)
    db.executescript("CREATE TABLE metadata(name text,value text);CREATE TABLE tiles(zoom_level integer,tile_column integer,tile_row integer,tile_data blob);CREATE UNIQUE INDEX t ON tiles(zoom_level,tile_column,tile_row);")
    n=0; zs=set()
    for area in sorted(os.listdir(W)):
        ad=os.path.join(W,area)
        if not os.path.isdir(ad): continue
        for z in os.listdir(ad):
            for x in os.listdir(os.path.join(ad,z)):
                for f in os.listdir(os.path.join(ad,z,x)):
                    if not f.endswith("."+ext): continue
                    y=int(f.split(".")[0]); zi=int(z)
                    db.execute("INSERT OR REPLACE INTO tiles VALUES(?,?,?,?)",(zi,int(x),2**zi-1-y,open(os.path.join(ad,z,x,f),"rb").read()))
                    n+=1; zs.add(zi)
    for k,v in dict(name=f"DTK25 sample {fmt}",format=("jpg" if fmt=="jpg" else fmt),type="baselayer",version="1",minzoom=min(zs),maxzoom=max(zs),bounds="9.2,55.6,12.7,56.4",attribution="Indeholder data fra Klimadatastyrelsen / Dataforsyningen (DTK25)").items():
        db.execute("INSERT INTO metadata VALUES(?,?)",(k,str(v)))
    db.commit(); db.close()
    pm=mb.replace(".mbtiles",".pmtiles")
    if os.path.exists(pm): os.remove(pm)
    t=time.time()
    subprocess.run([PM,"convert",mb,pm],check=True,capture_output=True)
    print(fmt,"tiles",n,"mbtiles",os.path.getsize(mb),"pmtiles",os.path.getsize(pm),"convert_s",round(time.time()-t,2))
