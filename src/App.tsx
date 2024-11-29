import { useEffect, useRef, useState } from "react";
import "./App.css";
import Editor from "./components/Editor";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { languageOptions } from "../constants/Language";
import { Button } from "./components/ui/button";
import axios from "axios";
import Alert from "./assets/common/Alert";
import { Input } from "./components/ui/input";
import OnlineMembers from "./assets/common/OnlineMembers";
import { toast } from "sonner";
import io from "socket.io-client";
import moment from "moment";

function App() {
  const inputRef = useRef<HTMLInputElement>();
  const [font, setFont] = useState("15px");
  const [Language, setLanguage] = useState(languageOptions[0].value);
  const [theme, setTheme] = useState("dark");
  const [processing, setProcessing] = useState(false);
  const [input, setInput] = useState(
    localStorage.getItem("code") ? localStorage.getItem("code") : ""
  );
  const [outputDetails, setOutPutDetails] = useState<any>("");
  const [alert, setAlert] = useState<Boolean>(false);
  const [isCollaborating, setIsCollaborating] = useState<Boolean>(false);
  const [roomValue, setRoomValue] = useState<any>();
  const [socket, setSocket] = useState<any>();
  const [online, setOnline] = useState<String[]>([]);
  const [cursorPointer, setCursorPointer] = useState<any>({
    x: 0,
    y: 0,
  });
  const [codeRanByOther, setCodeRanByOther] = useState<any>([]);
  useEffect(() => {
    const newSocket = io("https://code-compiler-backend-wno4.onrender.com", {
      transports: ["websocket", "polling"],
    });
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log(`Connected with ID: ${newSocket.id}`);
    });

    newSocket.on("UsersInRoom", (data) => {
      setOnline(data);
    });

    newSocket.on("joined_Successfully", (data) => {
      toast.success(data);
      console.log(data, "data");
    });

    newSocket.on("Code_changing", (data) => {
      setInput(data.code);
    });

    newSocket.on("cursor_changing", (data) => {
      setCursorPointer(data);
    });

    newSocket.on("change_configuration", (data) => {
      setLanguage(data.Language);
      setTheme(data.theme);
    });

    newSocket.on("code_ran_by_other", (data) => {
      setCodeRanByOther(() => [data]);
    });

    newSocket.on("disconnect", () => {
      console.log(`User disconnected`);
    });

    window.addEventListener("beforeunload", function (e) {
      e.preventDefault();
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // useEffect(() => {
  //   socket?.emit("code_change", { input, room: roomValue });
  // }, [input]);

  const handleCompile = () => {
    setProcessing(true);
    const formData = {
      language_id: languageOptions.find((f: any) => f.value == Language).id,
      // encode source code in base64
      source_code: btoa(input),
      //stdin: btoa(customInput),
    };
    const options = {
      method: "POST",
      url: "https://judge0-ce.p.rapidapi.com/submissions",
      params: { base64_encoded: "true", fields: "*" },
      headers: {
        "content-type": "application/json",
        "Content-Type": "application/json",
        "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
        "X-RapidAPI-Key": "4acb8c3627msh52c071e0f2f02b6p10fae2jsn009c36756a2b",
      },
      data: formData,
    };

    axios
      .request(options)
      .then(function (response) {
        const token = response.data.token;
        checkStatus(token);
      })
      .catch((err) => {
        let error = err.response ? err.response.data : err;
        console.log(error);
        setProcessing(false);
      });
  };

  const checkStatus = async (token: any) => {
    const options = {
      method: "GET",
      url: "https://judge0-ce.p.rapidapi.com/submissions" + "/" + token,
      params: { base64_encoded: "true", fields: "*" },
      headers: {
        "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
        "X-RapidAPI-Key": "4acb8c3627msh52c071e0f2f02b6p10fae2jsn009c36756a2b",
      },
    };
    try {
      let response = await axios.request(options);
      let statusId = response.data.status?.id;

      // Processed - we have a result
      if (statusId === 1 || statusId === 2) {
        // still processing
        setTimeout(() => {
          checkStatus(token);
        }, 2000);
        return;
      } else {
        setProcessing(false);
        setOutPutDetails(response.data);
        if (isCollaborating) {
          socket.emit("code_ran", {
            data: response.data,
            room: roomValue,
            date: Date.now(),
          });
        }
        return;
      }
    } catch (err) {
      console.log("err", err);
      setProcessing(false);
    }
  };

  const getOutput = (outputDetails: any) => {
    let statusId: any = outputDetails?.status?.id;

    if (statusId === 6) {
      // compilation error
      return (
        <pre className="px-2 py-1 font-normal text-xs text-red-500">
          {atob(outputDetails?.compile_output)}
        </pre>
      );
    } else if (statusId === 3) {
      return (
        <pre className="px-2 py-1 h-[50vh] font-normal text-xs text-green-500">
          {atob(outputDetails.stdout) == "ée"
            ? "No Output"
            : atob(outputDetails.stdout) !== null
            ? `${atob(outputDetails.stdout)}`
            : null}
        </pre>
      );
    } else if (statusId === 5) {
      return (
        <pre className="px-2 py-1 font-normal text-xs text-red-500">
          {`Time Limit Exceeded`}
        </pre>
      );
    } else {
      return (
        <pre className="px-2 py-1 font-normal text-xs text-red-500">
          {atob(outputDetails?.stderr)}
        </pre>
      );
    }
  };

  return (
    <>
      {isCollaborating && online.length > 1 && (
        <img
          style={{
            position: "fixed",
            left: `${cursorPointer.x}px`,
            top: `${cursorPointer.y}px`,
            zIndex: 9999999,
            width: "20px",
            height: "20px",
          }}
          src="/cursor.png"
        />
      )}

      <Alert
        handleSubmit={(data: any) => {
          setIsCollaborating(true);
          setAlert(false);
          setRoomValue(data);
          socket.emit("joinRoom", data);
          setInput("");
          return;
        }}
        title={"Are you sure you want to start Collaborating?"}
        description={"Your Code will not be saved!!"}
        open={alert}
        setOpen={setAlert}
      />
      <div className="flex">
        <div className="w-[70%]">
          <div className="flex gap-6 p-4 border-b-4">
            <Select
              value={Language}
              onValueChange={(l) => {
                setLanguage(l);
                socket.emit("configuration_change", {
                  Language: l,
                  theme: theme,
                  room: roomValue,
                });
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Language</SelectLabel>
                  {languageOptions.map((l: any, index: number) => {
                    return (
                      <SelectItem key={index} value={l.value}>
                        {l.name}
                      </SelectItem>
                    );
                  })}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select
              value={theme}
              onValueChange={(v) => {
                setTheme(v);
                socket.emit("configuration_change", {
                  Language: Language,
                  theme: v,
                  room: roomValue,
                });
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a Theme" />
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Theme</SelectLabel>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </SelectTrigger>
            </Select>
            <Select value={font} onValueChange={(v) => setFont(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Font Size" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Size</SelectLabel>
                  <SelectItem value="12px">12px</SelectItem>
                  <SelectItem value="15px">15px</SelectItem>
                  <SelectItem value="20px">20px</SelectItem>
                  <SelectItem value="25px">25px</SelectItem>
                  <SelectItem value="30px">30px</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button disabled={processing} onClick={() => handleCompile()}>
              {processing ? "Please Wait..." : "Run"}
            </Button>
            {!isCollaborating && (
              <Button onClick={() => setAlert(true)}>Collaborate</Button>
            )}
            {isCollaborating && (
              <>
                <Input ref={inputRef} disabled value={roomValue} />{" "}
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(inputRef?.current?.value);
                    toast.success("Copied to Clipboard");
                  }}
                >
                  Copy
                </Button>
                <div className="flex justify-center items-center gap-5 relative">
                  {online.map((el, index) => {
                    return <OnlineMembers key={index} name={el} />;
                  })}
                  <div className="w-3 h-3 bg bg-green-400 absolute rounded-full top-0 right-0 border border-0.5"></div>
                </div>
              </>
            )}
          </div>
          <div
            onMouseMove={(e) =>
              socket.emit("cursor_track", {
                cursor: {
                  x: e.clientX,
                  y: e.clientY,
                },
                room: roomValue,
              })
            }
          >
            <Editor
              handleInput={(data: any) => {
                localStorage.setItem("code", data);
                setInput(data);
                socket?.emit("code_change", { input: data, room: roomValue });
              }}
              value={input}
              font={font}
              Language={Language}
              theme={theme}
            />
          </div>
        </div>
        <div className="border b-l-3 w-[30%]">
          <div className="bg overflow-auto bg-black h-[100vh] text-white p-2">
            {outputDetails ? <>{getOutput(outputDetails)}</> : null}
            {isCollaborating && (
              <div>
                {codeRanByOther.map((el: any, index: any) => {
                  return (
                    <div key={index}>
                      <p>
                        Ran By: {el.id} {moment(el.date).fromNow()}
                      </p>
                      {getOutput(el.data)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center items-center p-3"></div>
        </div>
      </div>
    </>
  );
}
export default App;
