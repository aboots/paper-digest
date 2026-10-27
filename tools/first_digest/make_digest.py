"""One-off builder for the first digest (2026-10-27). Pulls titles/authors/dates from arXiv & PubMed so nothing is typed by hand;
summaries below are hand-written from the abstracts."""
import json,sys,urllib.request,xml.etree.ElementTree as ET,datetime,os
NS={'a':'http://www.w3.org/2005/Atom'}
def arx(ids):
    d=urllib.request.urlopen('https://export.arxiv.org/api/query?max_results=100&id_list='+','.join(ids),timeout=60).read()
    out={}
    for e in ET.fromstring(d).findall('a:entry',NS):
        i=e.find('a:id',NS).text.split('/abs/')[1].split('v')[0]
        out[i]=dict(title=' '.join(e.find('a:title',NS).text.split()),authors=[a.find('a:name',NS).text for a in e.findall('a:author',NS)],published=e.find('a:published',NS).text[:10])
    return out
def pm(ids):
    d=urllib.request.urlopen('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&retmode=xml&id='+','.join(ids),timeout=60).read()
    out={}
    for a in ET.fromstring(d).findall('.//PubmedArticle'):
        out[a.find('.//PMID').text]=dict(title=''.join(a.find('.//ArticleTitle').itertext()).strip(),
          authors=[((x.findtext('ForeName') or x.findtext('Initials') or '')+' '+(x.findtext('LastName') or '')).strip() for x in a.findall('.//Author')],
          doi=[x.text for x in a.findall('.//ArticleIdList/ArticleId') if x.get('IdType')=='doi'][0])
    return out
P=json.load(open(os.path.join(os.path.dirname(__file__),'curated.json')))
A=arx([p['arxiv'] for p in P if 'arxiv' in p]); M=pm([p['pmid'] for p in P if 'pmid' in p])
papers=[]
for p in P:
    if 'arxiv' in p:
        m=A[p['arxiv']]; url='https://arxiv.org/abs/'+p['arxiv']; pdf='https://arxiv.org/pdf/'+p['arxiv']; pid='arxiv:'+p['arxiv']; pub=m['published']
    else:
        m=M[p['pmid']]; url='https://pubmed.ncbi.nlm.nih.gov/%s/'%p['pmid']; pdf=None; pid='pmid:'+p['pmid']; pub=p['published']
        if p.get('doi_url'): pdf=None
    e=dict(id=pid,title=m['title'],authors=m['authors'],url=url,source=p['source'],published=pub,topics=p['topics'],why_it_matters=p['why'],summary=[p['problem'],p['method'],p['result']],score=p['score'])
    if pdf: e['pdf_url']=pdf
    papers.append(e)
papers.sort(key=lambda x:x['published'],reverse=True); papers.sort(key=lambda x:-x['score'])
D=dict(date='2026-10-27',generated_at='2026-10-27T03:30:00-07:00',papers=papers)
root=os.path.join(os.path.dirname(__file__),'..','..','data'); os.makedirs(root+'/archive',exist_ok=True)
for f in ['digest.json','archive/2026-10-27.json']: json.dump(D,open(os.path.join(root,f),'w'),ensure_ascii=False,indent=1)
json.dump(dict(dates=['2026-10-27']),open(root+'/index.json','w'),indent=1)
print(len(papers))
