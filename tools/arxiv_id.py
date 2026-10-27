import sys,urllib.request,xml.etree.ElementTree as ET,json
NS={'a':'http://www.w3.org/2005/Atom','x':'http://arxiv.org/schemas/atom'}
ids=sys.argv[1:]
d=urllib.request.urlopen('https://export.arxiv.org/api/query?max_results=50&id_list='+','.join(ids),timeout=60).read()
for e in ET.fromstring(d).findall('a:entry',NS):
    c=e.find('x:comment',NS); j=e.find('x:journal_ref',NS)
    print('###',e.find('a:id',NS).text.split('/abs/')[1],e.find('a:published',NS).text[:10],'|',' '.join(e.find('a:title',NS).text.split()))
    print('AUTH:',', '.join(a.find('a:name',NS).text for a in e.findall('a:author',NS)))
    print('COMMENT:',c.text if c is not None else '', '| JREF:', j.text if j is not None else '')
    print(' '.join(e.find('a:summary',NS).text.split()));print()
