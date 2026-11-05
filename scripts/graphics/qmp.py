#!/usr/bin/env python3
"""Small local-only QMP client for repeatable VM acceptance evidence."""
import argparse,json,socket

def execute(path,command,arguments=None):
    with socket.socket(socket.AF_UNIX,socket.SOCK_STREAM) as sock:
        sock.settimeout(15);sock.connect(path)
        stream=sock.makefile('rwb',buffering=0)
        json.loads(stream.readline())
        def request(name,args,ident):
            payload={'execute':name,'id':ident}
            if args is not None:payload['arguments']=args
            stream.write(json.dumps(payload).encode()+b'\n')
            while True:
                line=stream.readline()
                if not line:raise RuntimeError('QMP disconnected')
                value=json.loads(line)
                if value.get('id')==ident:
                    if 'error' in value:raise RuntimeError(value['error'])
                    return value.get('return')
        request('qmp_capabilities',None,1)
        return request(command,arguments,2)
if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('socket');ap.add_argument('command');ap.add_argument('arguments',nargs='?');a=ap.parse_args()
    print(json.dumps(execute(a.socket,a.command,json.loads(a.arguments) if a.arguments else None)))
