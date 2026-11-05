import json, os, statistics, collections, sys
W=sys.argv[1]; counts={int(k):v for k,v in json.load(open(sys.argv[2])).items()}
rows={}
for l in open(os.path.join(W,"fetch-log.jsonl")):
    r=json.loads(l)
    if "bytes" in r: rows[(r["area"],r["z"],r["x"],r["y"],r["fmt"])]=r["bytes"]
for (a,z,x,y,f) in list(rows):
    pass
# webp-størrelser fra disk
for a in os.listdir(W):
    ad=os.path.join(W,a)
    if not os.path.isdir(ad): continue
    for z in os.listdir(ad):
        for x in os.listdir(os.path.join(ad,z)):
            for f in os.listdir(os.path.join(ad,z,x)):
                if f.endswith(".webp"): rows[(a,int(z),int(x),int(f[:-5]),"webp")]=os.path.getsize(os.path.join(ad,z,x,f))
areas=sorted({k[0] for k in rows})
def avg(fmt,z,area): 
    v=[b for k,b in rows.items() if k[0]==area and k[1]==z and k[4]==fmt]; return statistics.mean(v)
res={}
for fmt in ("jpg","webp","png"):
    lo=mid=hi=0; tab=[]
    for z in range(6,17):
        zz=max(z,10)
        per=[avg(fmt,zz,a) for a in areas]
        m=statistics.mean(per); n=counts[z]
        lo+=n*min(per); mid+=n*m; hi+=n*max(per)
        tab.append((z,n,round(m),round(n*m/1e6,1)))
    res[fmt]=(lo,mid,hi,tab)
    print(fmt,"lav/midt/høj GB:",round(lo/1e9,2),round(mid/1e9,2),round(hi/1e9,2))
print("z | fliser DK | jpg gns B | jpg MB | webp gns B | webp MB | png gns B | png MB")
for i,z in enumerate(range(6,17)):
    j=res["jpg"][3][i]; w=res["webp"][3][i]; p=res["png"][3][i]
    print(z,j[1],j[2],j[3],w[2],w[3],p[2],p[3],sep=" | ")
print("sum fliser", sum(counts[z] for z in range(6,17)))
print("fliser z6-15:", sum(counts[z] for z in range(6,16)))
# uden z16
for fmt in ("jpg","webp"):
    t=res[fmt][3]; print(fmt,"z6-15 GB",round(sum(x[3] for x in t if x[0]<=15)/1e3,2))
