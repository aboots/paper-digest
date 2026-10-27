import sys,urllib.request,urllib.parse,xml.etree.ElementTree as ET,time,json
NS={'a':'http://www.w3.org/2005/Atom'}
def q(query,n=60,since='2026-10-04'):
    u='https://export.arxiv.org/api/query?'+urllib.parse.urlencode({'search_query':query,'sortBy':'submittedDate','sortOrder':'descending','max_results':n})
    d=urllib.request.urlopen(u,timeout=60).read()
    r=ET.fromstring(d); out=[]
    for e in r.findall('a:entry',NS):
        pub=e.find('a:published',NS).text[:10]
        if pub<since: continue
        out.append(dict(id=e.find('a:id',NS).text.split('/abs/')[1],title=' '.join(e.find('a:title',NS).text.split()),pub=pub,
          authors=[a.find('a:name',NS).text for a in e.findall('a:author',NS)],
          abs=' '.join(e.find('a:summary',NS).text.split()),
          cat=e.find('{http://arxiv.org/schemas/atom}primary_category').attrib['term'],
          comment=(e.find('{http://arxiv.org/schemas/atom}comment').text if e.find('{http://arxiv.org/schemas/atom}comment') is not None else '')))
    return out
if __name__=='__main__':
    full = len(sys.argv)>2 and sys.argv[2]=='full'
    for p in q(sys.argv[1]):
        print(p['id'],p['pub'],p['cat'],'|',p['title'],'|',', '.join(p['authors'][:3]),'|',p['comment'][:80])
        if full: print('   ',p['abs'][:600])
