// Wayfire 0.9 IPC bridge: Waybar's wlr/workspaces protocol is not supplied by this release.
#include <nlohmann/json.hpp>
#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>
#include <cstdint>
#include <cstring>
#include <cstdlib>
#include <iostream>
#include <stdexcept>
using nlohmann::json;
static void transfer(int fd,void* buffer,size_t length,bool sending){
    auto p=static_cast<char*>(buffer);
    while(length){ssize_t n=sending?send(fd,p,length,MSG_NOSIGNAL):recv(fd,p,length,0);if(n<=0)throw std::runtime_error("IPC disconnected");p+=n;length-=n;}
}
static json request(const std::string& method,json data=json::object()){
    const char* path=std::getenv("WAYFIRE_SOCKET");
    if(!path||std::strlen(path)>=sizeof(sockaddr_un::sun_path))throw std::runtime_error("missing IPC socket");
    int fd=socket(AF_UNIX,SOCK_STREAM|SOCK_CLOEXEC,0);if(fd<0)throw std::runtime_error("socket");
    struct Close{int fd;~Close(){close(fd);}} close_fd{fd};
    timeval timeout{2,0};setsockopt(fd,SOL_SOCKET,SO_RCVTIMEO,&timeout,sizeof(timeout));setsockopt(fd,SOL_SOCKET,SO_SNDTIMEO,&timeout,sizeof(timeout));
    sockaddr_un addr{};addr.sun_family=AF_UNIX;std::strcpy(addr.sun_path,path);
    if(connect(fd,reinterpret_cast<sockaddr*>(&addr),sizeof(addr))<0)throw std::runtime_error("IPC connect");
    std::string message=json{{"method",method},{"data",data}}.dump();uint32_t size=message.size();
    transfer(fd,&size,4,true);transfer(fd,message.data(),size,true);transfer(fd,&size,4,false);
    if(size>1024*1024)throw std::runtime_error("IPC response too large");
    message.resize(size);transfer(fd,message.data(),size,false);return json::parse(message);
}
int main(int argc,char** argv){try{
    auto info=request("window-rules/get-focused-output").at("info");
    int x=info.at("workspace").at("x"),width=info.at("workspace").at("grid_width");
    if(argc>1){int delta=std::string(argv[1])=="prev"?-1:1;auto result=request("vswitch/set-workspace",{{"output-id",info.at("id")},{"x",(x+delta+width)%width},{"y",info.at("workspace").at("y")}});return result.contains("error")?1:0;}
    std::string text;for(int i=0;i<width;i++){if(i)text+="  ";text+=i==x?"["+std::to_string(i+1)+"]":std::to_string(i+1);}
    std::cout<<json{{"text",text},{"tooltip","Espacios · clic: siguiente · rueda: cambiar"}}.dump()<<'\n';
    return 0;
}catch(const std::exception& e){std::cerr<<e.what()<<'\n';std::cout<<"{\"text\":\"Espacios —\"}\n";return 1;}}
